import {
  FinanceStatus,
  FinanceType,
  NotificationType,
  OrderStatus,
  PigStatus,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PAID_EQUIVALENT_STATUSES = new Set<OrderStatus>([
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.DISPATCHED,
  OrderStatus.COMPLETED,
]);

export type OrderTransitionResult = {
  success: boolean;
  error?: string;
  orderNumber?: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  financeSynced?: boolean;
  refundReversed?: boolean;
  stockRestored?: boolean;
};

/**
 * Transitions a StoreOrder to `nextStatus`, keeping inventory, FinanceTransaction,
 * AuditLog, and Staff Notifications completely synchronized.
 */
export async function applyStoreOrderStatusChange(params: {
  orderId: string;
  nextStatus: OrderStatus;
  actorId: string;
  actorRole: string;
  paymentReference?: string | null;
  reason?: string;
}): Promise<OrderTransitionResult> {
  const { orderId, nextStatus, actorId, actorRole, paymentReference, reason } = params;

  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const previousStatus = order.status;
  let financeSynced = false;
  let refundReversed = false;
  let stockRestored = false;

  // 1. Update order status (and optional payment reference)
  await prisma.storeOrder.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      ...(paymentReference ? { paymentReference } : {}),
    },
  });

  // 2. Revenue Sync (Phase 5.1): Create APPROVED INCOME when marked PAID or COMPLETED
  if (nextStatus === OrderStatus.PAID || nextStatus === OrderStatus.COMPLETED) {
    const finTxId = `ECOM-${order.orderNumber}`;
    const existingIncome = await prisma.financeTransaction.findUnique({
      where: { transactionId: finTxId },
    });

    if (!existingIncome) {
      await prisma.financeTransaction.create({
        data: {
          transactionId: finTxId,
          type: FinanceType.INCOME,
          amount: order.totalAmount,
          reference: "E-Commerce Sales",
          description: `E-Commerce Order ${order.orderNumber} (${order.customerName})${
            paymentReference ? ` [Ref: ${paymentReference}]` : ""
          }`,
          paymentMethod: order.paymentMethod || "Mobile Money",
          recordedById: actorId,
          transactionDate: new Date(),
          status: FinanceStatus.APPROVED,
          approvedById: actorId,
          approvedAt: new Date(),
        },
      });
      financeSynced = true;
    }
  }

  // 3. Cancellation Handling: Stock Restoration (Phase 4.1) & Refund Reversal (Phase 5.2)
  if (nextStatus === OrderStatus.CANCELLED && previousStatus !== OrderStatus.CANCELLED) {
    // Restore stock for each line item
    for (const item of order.items ?? []) {
      if (!item.productId || item.quantity <= 0) continue;
      const prod = await prisma.storeProduct.findUnique({
        where: { id: item.productId },
      });
      if (prod) {
        await prisma.storeProduct.update({
          where: { id: prod.id },
          data: {
            stock: prod.stock + item.quantity,
            isAvailable: true,
          },
        });
        stockRestored = true;

        // If this SKU was linked to a specific pig marked SOLD, restore to ACTIVE
        if (prod.pigId) {
          const linkedPig = await prisma.pig.findUnique({
            where: { id: prod.pigId },
            select: { id: true, status: true },
          });
          if (linkedPig && linkedPig.status === PigStatus.SOLD) {
            await prisma.pig.update({
              where: { id: linkedPig.id },
              data: { status: PigStatus.ACTIVE },
            });
          }
        }
      }
    }

    // Check if an INCOME entry was already recorded (previously PAID / COMPLETED)
    const finTxId = `ECOM-${order.orderNumber}`;
    const refundTxId = `ECOM-REFUND-${order.orderNumber}`;
    const [existingIncome, existingRefund] = await Promise.all([
      prisma.financeTransaction.findUnique({ where: { transactionId: finTxId } }),
      prisma.financeTransaction.findUnique({ where: { transactionId: refundTxId } }),
    ]);

    if ((existingIncome || PAID_EQUIVALENT_STATUSES.has(previousStatus)) && !existingRefund) {
      await prisma.financeTransaction.create({
        data: {
          transactionId: refundTxId,
          type: FinanceType.EXPENSE,
          amount: order.totalAmount,
          reference: "E-Commerce Refunds",
          description: `Refund / Reversal for cancelled E-Commerce Order ${order.orderNumber} (${order.customerName})${
            reason ? ` - ${reason}` : ""
          }`,
          paymentMethod: order.paymentMethod || "Mobile Money",
          recordedById: actorId,
          transactionDate: new Date(),
          status: FinanceStatus.APPROVED,
          approvedById: actorId,
          approvedAt: new Date(),
        },
      });
      refundReversed = true;

      // Notify FINANCE_OFFICER and SUPER_ADMIN staff about refund reversal
      const notifyStaff = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          role: { in: [Role.SUPER_ADMIN, Role.FINANCE_OFFICER] },
        },
        select: { id: true },
      });
      if (notifyStaff.length > 0) {
        await prisma.notification.createMany({
          data: notifyStaff.map((staff) => ({
            userId: staff.id,
            type: NotificationType.WARNING,
            title: `E-Commerce Refund Reversal: ${order.orderNumber}`,
            message: `Paid order ${order.orderNumber} (${order.customerName}) was cancelled. A refund reversal of ${order.totalAmount.toString()} RWF was posted to FinanceTransaction (${refundTxId}).`,
            relatedEntity: "STORE_ORDER",
            relatedEntityId: order.id,
          })),
        });
      }
    }
  }

  // 4. Write AuditLog entry
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      role: actorRole,
      action: nextStatus === OrderStatus.CANCELLED ? "ORDER_CANCELLED" : "ORDER_STATUS_UPDATED",
      entity: "STORE_ORDER",
      entityId: orderId,
      previousValue: { status: previousStatus },
      newValue: {
        orderNumber: order.orderNumber,
        status: nextStatus,
        paymentReference: paymentReference ?? order.paymentReference ?? null,
        stockRestored,
        financeSynced,
        refundReversed,
        reason: reason ?? null,
      },
    },
  });

  return {
    success: true,
    orderNumber: order.orderNumber,
    previousStatus,
    newStatus: nextStatus,
    financeSynced,
    refundReversed,
    stockRestored,
  };
}
