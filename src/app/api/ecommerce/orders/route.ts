import { NextRequest, NextResponse } from "next/server";
import { NotificationType, OrderStatus, PigStatus, Prisma, Role } from "@prisma/client";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { checkPigVetClearance } from "@/lib/vet-clearance";

export const dynamic = "force-dynamic";

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `ORD-${year}-${suffix}${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber")?.trim().toUpperCase();
    const contact = searchParams.get("contact")?.trim();

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Provide an orderNumber query parameter to track an order." },
        { status: 400 }
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, category: true, sourcePigTag: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Basic contact match when provided so buyers can verify ownership cleanly
    if (contact) {
      const normalizedContact = contact.replace(/[\s\-().]/g, "").toLowerCase();
      const emailMatch = order.customerEmail?.toLowerCase() === normalizedContact;
      const phoneMatch = order.customerPhone?.replace(/[\s\-().]/g, "").endsWith(normalizedContact.slice(-8));
      if (!emailMatch && !phoneMatch) {
        return NextResponse.json(
          { error: "Order number and phone/email do not match." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        totalAmount: order.totalAmount.toString(),
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference ?? null,
        shippingAddress: order.shippingAddress ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: (order.items ?? []).map((item) => ({
          name: item.product?.name || "Product",
          category: item.product?.category || "General",
          sourcePigTag: item.product?.sourcePigTag ?? null,
          quantity: item.quantity,
          price: item.price.toString(),
        })),
      },
    });
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return NextResponse.json(
        { error: "E-Commerce tables are not yet provisioned in Supabase." },
        { status: 503 }
      );
    }
    console.error("Order track error:", err);
    return NextResponse.json({ error: "Failed to track order." }, { status: 500 });
  }
}

type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      shippingAddress?: string;
      paymentMethod?: string;
      notes?: string;
      items?: CheckoutItemInput[];
    };

    const customerName = body.customerName?.trim() || "";
    const customerEmail = body.customerEmail?.trim().toLowerCase() || null;
    const customerPhone = body.customerPhone?.trim() || null;
    const shippingAddress = body.shippingAddress?.trim() || null;
    const paymentMethod = body.paymentMethod?.trim() || "MTN MoMo";
    const notes = body.notes?.trim() || null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (customerName.length < 2) {
      return NextResponse.json({ error: "Customer full name is required." }, { status: 400 });
    }
    if (!customerPhone && !customerEmail) {
      return NextResponse.json(
        { error: "Provide at least a telephone number or email address." },
        { status: 400 }
      );
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "Cart cannot be empty." }, { status: 400 });
    }

    // Aggregate quantities per productId
    const requestedMap = new Map<string, number>();
    for (const item of items) {
      const pid = String(item?.productId || "").trim();
      const qty = Number(item?.quantity);
      if (!pid || !Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: "Invalid cart item or quantity." }, { status: 400 });
      }
      requestedMap.set(pid, (requestedMap.get(pid) ?? 0) + qty);
    }

    const productIds = Array.from(requestedMap.keys());
    const dbProducts = await prisma.storeProduct.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let totalAmount = new Prisma.Decimal(0);
    const verifiedLines: Array<{
      product: (typeof dbProducts)[number];
      quantity: number;
      unitPrice: Prisma.Decimal;
    }> = [];

    for (const [pid, qty] of requestedMap.entries()) {
      const product = productMap.get(pid);
      if (!product || !product.isAvailable) {
        return NextResponse.json(
          { error: `Product is no longer available for purchase.` },
          { status: 400 }
        );
      }
      if (product.stock < qty) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}" (available: ${product.stock}).` },
          { status: 409 }
        );
      }
      if (product.pigId) {
        const clearance = await checkPigVetClearance(product.pigId, "SALE");
        if (!clearance.cleared) {
          return NextResponse.json(
            { error: `Livestock item "${product.name}" is temporarily unavailable pending vet clearance.` },
            { status: 409 }
          );
        }
      }

      const unitPrice = product.price instanceof Prisma.Decimal
        ? product.price
        : new Prisma.Decimal(String(product.price));
      totalAmount = totalAmount.plus(unitPrice.mul(qty));
      verifiedLines.push({ product, quantity: qty, unitPrice });
    }

    const orderNumber = generateOrderNumber();

    const createdOrder = await prisma.storeOrder.create({
      data: {
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        totalAmount,
        status: OrderStatus.PENDING,
        paymentMethod,
        notes,
      },
    });

    for (const line of verifiedLines) {
      await prisma.storeOrderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: line.product.id,
          quantity: line.quantity,
          price: line.unitPrice,
        },
      });

      const remainingStock = Math.max(0, line.product.stock - line.quantity);
      await prisma.storeProduct.update({
        where: { id: line.product.id },
        data: { stock: remainingStock },
      });

      if (line.product.pigId && remainingStock === 0) {
        await prisma.pig.update({
          where: { id: line.product.pigId },
          data: { status: PigStatus.SOLD },
        });
      }
    }

    // Notify Super Admins about incoming storefront order
    const admins = await prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: NotificationType.INFO,
          title: `New Store Order ${orderNumber}`,
          message: `${customerName} placed order ${orderNumber} totaling ${totalAmount.toString()} RWF (${paymentMethod}).`,
          relatedEntity: "STORE_ORDER",
          relatedEntityId: createdOrder.id,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        role: "STOREFRONT",
        action: "ORDER_PLACED",
        entity: "STORE_ORDER",
        entityId: createdOrder.id,
        newValue: {
          orderNumber,
          customerName,
          totalAmount: totalAmount.toString(),
          paymentMethod,
          itemCount: verifiedLines.length,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        order: {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          status: createdOrder.status,
          totalAmount: totalAmount.toString(),
          paymentMethod,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return NextResponse.json(
        { error: "E-Commerce tables are not yet provisioned in Supabase." },
        { status: 503 }
      );
    }
    console.error("E-Commerce checkout POST error:", err);
    return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
  }
}
