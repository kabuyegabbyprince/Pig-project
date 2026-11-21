"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus, PigHealthStatus, PigStatus, Prisma, Role } from "@prisma/client";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { checkPigVetClearance } from "@/lib/vet-clearance";
import { applyStoreOrderStatusChange } from "@/lib/ecommerce-service";

export type SerializedClearedPigOption = {
  id: string;
  tagNumber: string;
  breed: string | null;
  currentWeight: number | null;
};

export type SerializedStoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  category: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  pigId: string | null;
  sourcePigTag: string | null;
  createdAt: string;
};

export type SerializedStoreOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  totalAmount: string;
  status: OrderStatus;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  itemCount: number;
  syncedToFinance: boolean;
  refundedToFinance: boolean;
};

export type EcommerceOverviewData = {
  tableMissing: boolean;
  products: SerializedStoreProduct[];
  orders: SerializedStoreOrder[];
  clearedPigs: SerializedClearedPigOption[];
  totalRevenue: string;
  pendingOrdersCount: number;
};

export async function getEcommerceOverview(): Promise<EcommerceOverviewData> {
  try {
    const [products, orders, syncedTransactions, healthyPigs] = await Promise.all([
      prisma.storeProduct.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.storeOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.financeTransaction.findMany({
        where: {
          reference: { in: ["E-Commerce Sales", "E-Commerce Refunds"] },
          deletedAt: null,
        },
        select: { transactionId: true, reference: true },
      }),
      prisma.pig.findMany({
        where: {
          deletedAt: null,
          currentBeneficiaryId: null,
          healthStatus: PigHealthStatus.HEALTHY,
          status: { in: [PigStatus.ACTIVE, PigStatus.REGISTERED] },
        },
        orderBy: { tagNumber: "asc" },
        select: {
          id: true,
          tagNumber: true,
          breed: true,
          currentWeight: true,
        },
      }),
    ]);

    const syncedSet = new Set(
      syncedTransactions
        .filter((t) => t.reference === "E-Commerce Sales")
        .map((t) => t.transactionId)
    );
    const refundSet = new Set(
      syncedTransactions
        .filter((t) => t.reference === "E-Commerce Refunds")
        .map((t) => t.transactionId)
    );

    let totalRev = new Prisma.Decimal(0);
    let pendingOrdersCount = 0;

    const serializedOrders: SerializedStoreOrder[] = orders.map((order) => {
      if (
        order.status === OrderStatus.PAID ||
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.DISPATCHED
      ) {
        totalRev = totalRev.plus(order.totalAmount);
      }
      if (
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.PAID ||
        order.status === OrderStatus.PROCESSING
      ) {
        pendingOrdersCount += 1;
      }
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress ?? null,
        totalAmount: order.totalAmount.toString(),
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference ?? null,
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items?.length ?? 0,
        syncedToFinance: syncedSet.has(`ECOM-${order.orderNumber}`),
        refundedToFinance: refundSet.has(`ECOM-REFUND-${order.orderNumber}`),
      };
    });

    const linkedPigIds = new Set(products.map((p) => p.pigId).filter(Boolean));
    const clearedPigs: SerializedClearedPigOption[] = [];
    for (const p of healthyPigs) {
      if (linkedPigIds.has(p.id)) continue;
      const clearance = await checkPigVetClearance(p.id, "SALE");
      if (clearance.cleared) {
        clearedPigs.push({
          id: p.id,
          tagNumber: p.tagNumber,
          breed: p.breed,
          currentWeight: p.currentWeight,
        });
      }
    }

    const serializedProducts: SerializedStoreProduct[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      stock: p.stock,
      category: p.category,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      pigId: p.pigId ?? null,
      sourcePigTag: p.sourcePigTag ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    return {
      tableMissing: false,
      products: serializedProducts,
      orders: serializedOrders,
      clearedPigs,
      totalRevenue: totalRev.toString(),
      pendingOrdersCount,
    };
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return {
        tableMissing: true,
        products: [],
        orders: [],
        clearedPigs: [],
        totalRevenue: "0",
        pendingOrdersCount: 0,
      };
    }
    throw err;
  }
}

export async function createStoreProduct(formData: FormData) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const priceStr = String(formData.get("price") || "").trim();
  const stockStr = String(formData.get("stock") || "0").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") || "").trim() || null;
  const pigIdRaw = String(formData.get("pigId") || "").trim() || null;

  if (name.length < 2) {
    return { success: false, error: "Product name is required." };
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(priceStr) || Number(priceStr) <= 0) {
    return { success: false, error: "Enter a valid positive RWF price." };
  }
  let stock = Number.parseInt(stockStr, 10);
  if (Number.isNaN(stock) || stock < 0) {
    return { success: false, error: "Stock must be 0 or greater." };
  }

  let sourcePigTag: string | null = null;
  if (pigIdRaw) {
    const clearance = await checkPigVetClearance(pigIdRaw, "SALE");
    if (!clearance.cleared || !clearance.pig) {
      return {
        success: false,
        error:
          clearance.reason ||
          "Selected pig has not passed veterinary clearance and cannot be listed for sale.",
      };
    }
    sourcePigTag = clearance.pig.tagNumber;
    // Live individual animal SKU is quantity 1 unless explicitly adjusted
    if (stock === 0) stock = 1;
  }

  try {
    const product = await prisma.storeProduct.create({
      data: {
        name,
        description,
        price: new Prisma.Decimal(priceStr),
        stock,
        category: category || (pigIdRaw ? "Livestock" : null),
        imageUrl,
        isAvailable: true,
        pigId: pigIdRaw,
        sourcePigTag,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "STORE_PRODUCT",
        entityId: product.id,
        newValue: {
          name,
          price: priceStr,
          stock,
          category: product.category,
          pigId: pigIdRaw,
          sourcePigTag,
        },
      },
    });

    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin");
    revalidatePath("/store");
    return { success: true };
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return { success: false, error: "E-Commerce tables are not yet created in Supabase." };
    }
    console.error("Failed to create store product:", err);
    return { success: false, error: "Failed to create store product." };
  }
}

export async function toggleProductAvailability(productId: string) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  try {
    const product = await prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!product) return { success: false, error: "Product not found." };

    const nextAvailable = !product.isAvailable;
    if (nextAvailable && product.pigId) {
      const clearance = await checkPigVetClearance(product.pigId, "SALE");
      if (!clearance.cleared) {
        return {
          success: false,
          error:
            clearance.reason ||
            "Cannot publish livestock SKU without active veterinary clearance.",
        };
      }
    }

    await prisma.storeProduct.update({
      where: { id: productId },
      data: { isAvailable: nextAvailable },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: nextAvailable ? "PUBLISHED" : "UNPUBLISHED",
        entity: "STORE_PRODUCT",
        entityId: productId,
        previousValue: { isAvailable: product.isAvailable },
        newValue: { name: product.name, isAvailable: nextAvailable },
      },
    });

    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/store");
    return { success: true, isAvailable: nextAvailable };
  } catch (err) {
    console.error("Failed to toggle product availability:", err);
    return { success: false, error: "Failed to update product." };
  }
}

export async function updateProductStock(productId: string, stock: number) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };
  if (!Number.isInteger(stock) || stock < 0) {
    return { success: false, error: "Stock must be a non-negative integer." };
  }

  try {
    const product = await prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!product) return { success: false, error: "Product not found." };

    await prisma.storeProduct.update({
      where: { id: productId },
      data: { stock },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "STOCK_UPDATED",
        entity: "STORE_PRODUCT",
        entityId: productId,
        previousValue: { stock: product.stock },
        newValue: { name: product.name, stock },
      },
    });

    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/store");
    return { success: true };
  } catch (err) {
    console.error("Failed to update stock:", err);
    return { success: false, error: "Failed to update stock." };
  }
}

const VALID_ORDER_STATUSES = new Set<string>(Object.values(OrderStatus));

export async function updateStoreOrderStatus(orderId: string, nextStatus: string) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  if (!VALID_ORDER_STATUSES.has(nextStatus)) {
    return { success: false, error: "Invalid order status." };
  }

  try {
    const res = await applyStoreOrderStatusChange({
      orderId,
      nextStatus: nextStatus as OrderStatus,
      actorId: actor.id,
      actorRole: actor.role,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to update order status." };
    }

    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath(`/dashboard/admin/ecommerce/${orderId}`);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/finance");
    revalidatePath("/dashboard/admin/reports");
    revalidatePath("/store");
    return res;
  } catch (err) {
    console.error("Failed to update order status:", err);
    return { success: false, error: "Failed to update order status." };
  }
}

export async function getStoreOrderDetail(orderId: string) {
  try {
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                sourcePigTag: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) return null;

    const [financeRows, auditRows] = await Promise.all([
      prisma.financeTransaction.findMany({
        where: {
          transactionId: {
            in: [`ECOM-${order.orderNumber}`, `ECOM-REFUND-${order.orderNumber}`],
          },
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { entity: "STORE_ORDER", entityId: order.id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, role: true } } },
      }),
    ]);

    return {
      order,
      financeRows,
      auditRows,
    };
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return null;
    }
    throw err;
  }
}
