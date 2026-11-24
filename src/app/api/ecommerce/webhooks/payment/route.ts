import { NextRequest } from "next/server";
import { OrderStatus, Role } from "@prisma/client";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { applyStoreOrderStatusChange } from "@/lib/ecommerce-service";
import { handleCorsPreflight, jsonWithCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsPreflight();
}

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
    return jsonWithCors({ error: "Invalid webhook signature." }, { status: 401 });
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
      return jsonWithCors(
        { error: "Either orderNumber or orderId is required." },
        { status: 400 }
      );
    }

    const order = await prisma.storeOrder.findFirst({
      where: orderId ? { id: orderId } : { orderNumber },
    });

    if (!order) {
      return jsonWithCors({ error: "Order not found." }, { status: 404 });
    }

    // Verify amount if gateway provided one
    if (body.amount !== undefined && body.amount !== null) {
      const paidNum = Number(body.amount);
      const expectedNum = Number(order.totalAmount.toString());
      if (Number.isNaN(paidNum) || paidNum < expectedNum) {
        return jsonWithCors(
          { error: "Paid amount is less than order total." },
          { status: 400 }
        );
      }
    }

    let nextStatus: OrderStatus = order.status;
    if (
      rawStatus === "PAID" ||
      rawStatus === "SUCCESS" ||
      rawStatus === "SUCCESSFUL" ||
      rawStatus === "COMPLETED"
    ) {
      nextStatus = OrderStatus.PAID;
    } else if (rawStatus === "FAILED" || rawStatus === "CANCELLED") {
      nextStatus = OrderStatus.CANCELLED;
    }

    if (nextStatus === order.status && !paymentReference) {
      return jsonWithCors({
        success: true,
        message: "No status transition needed.",
        orderNumber: order.orderNumber,
        status: order.status,
      });
    }

    const systemUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN, isActive: true },
      select: { id: true },
    });

    const result = await applyStoreOrderStatusChange({
      orderId: order.id,
      nextStatus,
      actorId: systemUser?.id || "GATEWAY_WEBHOOK",
      actorRole: "WEBHOOK",
      paymentReference: paymentReference || order.paymentReference,
      reason: `Automated payment webhook update (${body.provider || "Gateway"})`,
    });

    if (!result.success) {
      return jsonWithCors({ error: result.error || "Failed to transition order status." }, { status: 400 });
    }

    return jsonWithCors({
      success: true,
      orderNumber: order.orderNumber,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      financeSynced: result.financeSynced,
      stockRestored: result.stockRestored,
    });
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return jsonWithCors(
        { error: "E-Commerce tables are not yet provisioned in Supabase." },
        { status: 503 }
      );
    }
    console.error("Payment webhook error:", err);
    return jsonWithCors({ error: "Internal webhook processing error." }, { status: 500 });
  }
}
