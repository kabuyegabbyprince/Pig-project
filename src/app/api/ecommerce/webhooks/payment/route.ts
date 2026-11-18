import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Role } from "@prisma/client";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { applyStoreOrderStatusChange } from "@/lib/ecommerce-service";

export const dynamic = "force-dynamic";

function verifyWebhookAuth(req: NextRequest): boolean {
  const configuredSecret = process.env.ECOMMERCE_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) return true;

  const headerSecret = req.headers.get("x-webhook-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  return headerSecret === configuredSecret || bearerToken === configuredSecret;
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookAuth(req)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      orderNumber?: string;
      orderId?: string;
      status?: string;
      paymentStatus?: string;
      transactionReference?: string;
      provider?: string;
      amount?: number | string;
    };

    const orderNumber = body.orderNumber?.trim();
    const orderId = body.orderId?.trim();
    const rawStatus = (body.status || body.paymentStatus || "").trim().toUpperCase();
    const paymentReference = body.transactionReference?.trim() || null;

    if (!orderNumber && !orderId) {
      return NextResponse.json(
        { error: "Either orderNumber or orderId is required." },
        { status: 400 }
      );
    }

    const order = await prisma.storeOrder.findFirst({
      where: orderId ? { id: orderId } : { orderNumber },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Verify amount if gateway provided one
    if (body.amount !== undefined && body.amount !== null) {
      const paidNum = Number(body.amount);
      const expectedNum = Number(order.totalAmount.toString());
      if (Number.isNaN(paidNum) || paidNum < expectedNum) {
        return NextResponse.json(
          {
            error: `Payment amount mismatch (received ${paidNum}, expected ${expectedNum}).`,
          },
          { status: 400 }
        );
      }
    }

    let nextStatus: OrderStatus | null = null;
    if (["PAID", "SUCCESS", "SUCCESSFUL", "COMPLETED", "SETTLED"].includes(rawStatus)) {
      nextStatus = OrderStatus.PAID;
    } else if (["FAILED", "CANCELLED", "CANCELED", "VOID", "REFUNDED"].includes(rawStatus)) {
      nextStatus = OrderStatus.CANCELLED;
    }

    if (!nextStatus) {
      return NextResponse.json(
        { error: `Unsupported payment webhook status "${rawStatus}".` },
        { status: 400 }
      );
    }

    const systemAdmin = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN, isActive: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true },
    });

    const fallbackUser =
      systemAdmin ??
      (await prisma.user.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true },
      }));

    if (!fallbackUser) {
      return NextResponse.json(
        { error: "No active system account available to record financial reconciliation." },
        { status: 500 }
      );
    }

    const result = await applyStoreOrderStatusChange({
      orderId: order.id,
      nextStatus,
      actorId: fallbackUser.id,
      actorRole: `${body.provider || "PAYMENT_GATEWAY"}_WEBHOOK`,
      paymentReference,
      reason: `Payment webhook (${body.provider || "Mobile Money"}): ${rawStatus}`,
    });

    return NextResponse.json({
      success: result.success,
      orderNumber: result.orderNumber,
      status: result.newStatus,
      financeSynced: result.financeSynced,
      refundReversed: result.refundReversed,
      stockRestored: result.stockRestored,
    });
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return NextResponse.json(
        { error: "E-Commerce tables are not yet provisioned in Supabase." },
        { status: 503 }
      );
    }
    console.error("Payment webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
