"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import {
  FinanceStatus,
  FinanceType,
  NotificationType,
  OrderStatus,
  PigHealthStatus,
  PigStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { checkPigVetClearance, getClearedPigsForSale } from "@/lib/vet-clearance";
import { uploadToProductImageBucket } from "@/lib/product-images";
import { applyStoreOrderStatusChange } from "@/lib/ecommerce-service";
import { getEffectiveProductPrice } from "@/lib/ecommerce-pricing";

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
  isNegotiable: boolean;
  effectivePrice: string;
  hasActiveDiscount: boolean;
  discountPercent: number;
  discountPrice: string | null;
  discountLabel: string | null;
  discountEndsAt: string | null;
  stock: number;
  lowStockThreshold: number;
  category: string | null;
  storeSection: "ANIMALS" | "ANIMAL_FOOD";
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
  subtotalAmount: string;
  discountTotal: string;
  totalAmount: string;
  status: OrderStatus;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  itemCount: number;
  sections: ("ANIMALS" | "ANIMAL_FOOD")[];
  syncedToFinance: boolean;
  refundedToFinance: boolean;
};

export type SerializedStockReport = {
  id: string;
  reportedByName: string;
  cooperativeOwnerName: string;
  cooperativeOwnerRole: string;
  cellName: string;
  animalTitle: string;
  pigCount: number;
  estimatedWeightKg: string | null;
  suggestedPrice: string | null;
  pigId: string | null;
  sourcePigTag: string | null;
  notes: string | null;
  status: string;
  listedProductId: string | null;
  createdAt: string;
};

export type SerializedCellFeedSale = {
  id: string;
  saleNumber: string;
  productId: string | null;
  productName: string;
  buyerName: string;
  buyerPhone: string | null;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  paymentMethod: string;
  soldByName: string;
  cellName: string | null;
  financeTransactionId: string | null;
  verificationStatus: string;
  notes: string | null;
  createdAt: string;
};

export type EcommerceOverviewData = {
  tableMissing: boolean;
  products: SerializedStoreProduct[];
  orders: SerializedStoreOrder[];
  clearedPigs: SerializedClearedPigOption[];
  stockReports: SerializedStockReport[];
  feedSales: SerializedCellFeedSale[];
  totalRevenue: string;
  pendingOrdersCount: number;
};

function serializeProduct(p: Awaited<ReturnType<typeof prisma.storeProduct.findMany>>[number]): SerializedStoreProduct {
  const pricing = getEffectiveProductPrice(p);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price.toString(),
    isNegotiable: Boolean((p as { isNegotiable?: boolean }).isNegotiable),
    effectivePrice: pricing.effectivePrice.toFixed(2),
    hasActiveDiscount: pricing.hasActiveDiscount,
    discountPercent: pricing.discountPercentApplied,
    discountPrice: p.discountPrice ? p.discountPrice.toString() : null,
    discountLabel: p.discountLabel ?? null,
    discountEndsAt: p.discountEndsAt ? p.discountEndsAt.toISOString() : null,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold ?? 3,
    category: p.category,
    storeSection: p.storeSection === "ANIMAL_FOOD" ? "ANIMAL_FOOD" : "ANIMALS",
    imageUrl: p.imageUrl,
    isAvailable: p.isAvailable,
    pigId: p.pigId ?? null,
    sourcePigTag: p.sourcePigTag ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

async function notifyManagersStockedOut(
  productName: string,
  productId: string,
  source: string
) {
  try {
    const managers = await prisma.user.findMany({
      where: {
        role: { in: [Role.PROJECT_MANAGER, Role.SUPER_ADMIN] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (managers.length === 0) return;

    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        type: NotificationType.WARNING,
        title: `Stocked Out Alert: ${productName}`,
        message: `"${productName}" has reached 0 units in stock (${source}). Its item name remains saved in Gebyian Network marked Stocked Out so you can restock it anytime.`,
        relatedEntity: "STORE_PRODUCT",
        relatedEntityId: productId,
      })),
    });
  } catch (err) {
    console.error("Failed to send stock-out notification:", err);
  }
}

export async function getEcommerceOverview(options?: {
  includeClearedPigs?: boolean;
}): Promise<EcommerceOverviewData> {
  const includeClearedPigs = options?.includeClearedPigs !== false;
  try {
    const [products, orders, syncedTransactions, stockReports, feedSales] =
      await Promise.all([
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
        prisma.cooperativeStockReport
          .findMany({ orderBy: { createdAt: "desc" }, take: 50 })
          .catch(() => []),
        prisma.cellFeedSale
          .findMany({ orderBy: { createdAt: "desc" }, take: 50 })
          .catch(() => []),
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

    const productSectionMap = new Map<string, "ANIMALS" | "ANIMAL_FOOD">(
      products.map((p) => [p.id, p.storeSection === "ANIMAL_FOOD" ? "ANIMAL_FOOD" : "ANIMALS"])
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
      const sectionsSet = new Set<"ANIMALS" | "ANIMAL_FOOD">();
      for (const item of order.items ?? []) {
        const pid = (item as { productId?: string | null }).productId;
        if (pid && productSectionMap.has(pid)) {
          sectionsSet.add(productSectionMap.get(pid)!);
        }
      }
      if (sectionsSet.size === 0) {
        sectionsSet.add("ANIMALS");
      }
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress ?? null,
        subtotalAmount: (order.subtotalAmount ?? order.totalAmount).toString(),
        discountTotal: (order.discountTotal ?? 0).toString(),
        totalAmount: order.totalAmount.toString(),
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference ?? null,
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items?.length ?? 0,
        sections: Array.from(sectionsSet),
        syncedToFinance: syncedSet.has(`ECOM-${order.orderNumber}`),
        refundedToFinance: refundSet.has(`ECOM-REFUND-${order.orderNumber}`),
      };
    });

    const linkedPigIds = new Set(
      products.map((p) => p.pigId).filter((id): id is string => Boolean(id))
    );
    const clearedPigs: SerializedClearedPigOption[] = includeClearedPigs
      ? await getClearedPigsForSale(linkedPigIds)
      : [];

    return {
      tableMissing: false,
      products: products.map(serializeProduct),
      orders: serializedOrders,
      clearedPigs,
      stockReports: stockReports.map((r) => ({
        id: r.id,
        reportedByName: r.reportedByName,
        cooperativeOwnerName: r.cooperativeOwnerName,
        cooperativeOwnerRole: r.cooperativeOwnerRole,
        cellName: r.cellName,
        animalTitle: r.animalTitle,
        pigCount: r.pigCount,
        estimatedWeightKg: r.estimatedWeightKg ? r.estimatedWeightKg.toString() : null,
        suggestedPrice: r.suggestedPrice ? r.suggestedPrice.toString() : null,
        pigId: r.pigId ?? null,
        sourcePigTag: r.sourcePigTag ?? null,
        notes: r.notes ?? null,
        status: r.status,
        listedProductId: r.listedProductId ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      feedSales: feedSales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        productId: s.productId ?? null,
        productName: s.productName,
        buyerName: s.buyerName,
        buyerPhone: s.buyerPhone ?? null,
        quantity: s.quantity,
        unitPrice: s.unitPrice.toString(),
        totalAmount: s.totalAmount.toString(),
        paymentMethod: s.paymentMethod,
        soldByName: s.soldByName,
        cellName: s.cellName ?? null,
        financeTransactionId: s.financeTransactionId ?? null,
        verificationStatus: s.verificationStatus,
        notes: s.notes ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
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
        stockReports: [],
        feedSales: [],
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
  const rawSection = String(formData.get("storeSection") || "ANIMALS").trim().toUpperCase();
  const storeSection = rawSection === "ANIMAL_FOOD" ? "ANIMAL_FOOD" : "ANIMALS";
  const imageFile = formData.get("image") as File | null;
  const imageUrlInput = String(formData.get("imageUrl") || "").trim() || null;
  const isNegotiable =
    formData.get("isNegotiable") === "on" ||
    formData.get("isNegotiable") === "true" ||
    formData.get("isNegotiable") === "1";
  const pigIdRaw = String(formData.get("pigId") || "").trim() || null;
  const reportId = String(formData.get("reportId") || "").trim() || null;

  const discountPercentRaw = String(formData.get("discountPercent") || "0").trim();
  const discountPriceRaw = String(formData.get("discountPrice") || "").trim();
  const discountLabel = String(formData.get("discountLabel") || "").trim() || null;
  const discountEndsAtRaw = String(formData.get("discountEndsAt") || "").trim();
  const lowStockRaw = String(formData.get("lowStockThreshold") || "3").trim();

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

  const discountPercentNum = Number(discountPercentRaw || 0);
  if (Number.isNaN(discountPercentNum) || discountPercentNum < 0 || discountPercentNum > 90) {
    return { success: false, error: "Discount percentage must be between 0 and 90." };
  }
  const discountPriceNum = discountPriceRaw ? Number(discountPriceRaw) : null;
  if (
    discountPriceNum !== null &&
    (Number.isNaN(discountPriceNum) || discountPriceNum <= 0 || discountPriceNum >= Number(priceStr))
  ) {
    return { success: false, error: "Promo discount price must be positive and less than base price." };
  }
  const discountEndsAt = discountEndsAtRaw ? new Date(`${discountEndsAtRaw}T23:59:59.000Z`) : null;
  const lowStockThreshold = Math.max(1, Number.parseInt(lowStockRaw, 10) || 3);

  let imageUrl = imageUrlInput;
  if (imageFile && imageFile.size > 0) {
    try {
      imageUrl = await uploadToProductImageBucket(imageFile);
    } catch (uploadErr) {
      return {
        success: false,
        error: uploadErr instanceof Error ? uploadErr.message : "Failed to upload product image.",
      };
    }
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
    if (stock === 0) stock = 1;
  }

  const baseData = {
    name,
    description,
    price: new Prisma.Decimal(priceStr),
    discountPercent: new Prisma.Decimal(discountPercentNum.toFixed(2)),
    discountPrice:
      discountPriceNum !== null ? new Prisma.Decimal(discountPriceNum.toFixed(2)) : null,
    discountLabel,
    discountEndsAt,
    stock,
    lowStockThreshold,
    category:
      category ||
      (storeSection === "ANIMAL_FOOD" ? "Animal Feed" : "Livestock"),
    storeSection,
    imageUrl,
    isAvailable: true,
    pigId: pigIdRaw,
    sourcePigTag,
  };

  try {
    let product;
    try {
      product = await prisma.storeProduct.create({
        data: { ...baseData, isNegotiable },
      });
    } catch (colErr) {
      const msg = colErr instanceof Error ? colErr.message : "";
      if (/is_negotiable/i.test(msg)) {
        product = await prisma.storeProduct.create({ data: baseData });
      } else {
        throw colErr;
      }
    }

    if (reportId) {
      await prisma.cooperativeStockReport
        .update({
          where: { id: reportId },
          data: {
            status: "LISTED",
            listedProductId: product.id,
            reviewedById: actor.id,
          },
        })
        .catch(() => undefined);
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CREATED",
        entity: "STORE_PRODUCT",
        entityId: product.id,
        newValue: {
          name,
          description,
          storeSection,
          price: priceStr,
          isNegotiable,
          discountPercent: discountPercentNum,
          discountPrice: discountPriceNum,
          discountLabel,
          stock,
          category: product.category,
          imageUrl,
          pigId: pigIdRaw,
          sourcePigTag,
        },
      },
    });

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/field/stock-reports");
    revalidatePath("/dashboard/history");
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

export async function updateStoreProduct(formData: FormData) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  const productId = String(formData.get("productId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const priceStr = String(formData.get("price") || "").trim();
  const stockStr = String(formData.get("stock") || "0").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const rawSection = String(formData.get("storeSection") || "").trim().toUpperCase();
  const imageFile = formData.get("image") as File | null;
  const imageUrlInput = String(formData.get("imageUrl") || "").trim() || null;
  const isNegotiable =
    formData.get("isNegotiable") === "on" ||
    formData.get("isNegotiable") === "true" ||
    formData.get("isNegotiable") === "1";
  const pigIdRaw = String(formData.get("pigId") || "").trim() || null;

  const discountPercentRaw = String(formData.get("discountPercent") || "0").trim();
  const discountPriceRaw = String(formData.get("discountPrice") || "").trim();
  const discountLabel = String(formData.get("discountLabel") || "").trim() || null;
  const discountEndsAtRaw = String(formData.get("discountEndsAt") || "").trim();

  if (!productId) return { success: false, error: "Missing product ID." };
  if (name.length < 2) return { success: false, error: "Product name is required." };
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(priceStr) || Number(priceStr) <= 0) {
    return { success: false, error: "Enter a valid positive RWF price." };
  }
  const stock = Number.parseInt(stockStr, 10);
  if (Number.isNaN(stock) || stock < 0) {
    return { success: false, error: "Stock must be 0 or greater." };
  }

  const discountPercentNum = Number(discountPercentRaw || 0);
  if (Number.isNaN(discountPercentNum) || discountPercentNum < 0 || discountPercentNum > 90) {
    return { success: false, error: "Discount percentage must be between 0 and 90." };
  }
  const discountPriceNum = discountPriceRaw ? Number(discountPriceRaw) : null;
  if (
    discountPriceNum !== null &&
    (Number.isNaN(discountPriceNum) || discountPriceNum <= 0 || discountPriceNum >= Number(priceStr))
  ) {
    return { success: false, error: "Promo discount price must be positive and below base price." };
  }
  const discountEndsAt = discountEndsAtRaw ? new Date(`${discountEndsAtRaw}T23:59:59.000Z`) : null;

  try {
    const existing = await prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!existing) return { success: false, error: "Product not found." };

    const storeSection =
      rawSection === "ANIMAL_FOOD"
        ? "ANIMAL_FOOD"
        : rawSection === "ANIMALS"
          ? "ANIMALS"
          : existing.storeSection;

    let imageUrl = imageUrlInput ?? existing.imageUrl ?? null;
    if (imageFile && imageFile.size > 0) {
      try {
        imageUrl = await uploadToProductImageBucket(imageFile);
      } catch (uploadErr) {
        return {
          success: false,
          error: uploadErr instanceof Error ? uploadErr.message : "Failed to upload product image.",
        };
      }
    }

    let sourcePigTag = existing.sourcePigTag ?? null;
    if (pigIdRaw !== (existing.pigId ?? null)) {
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
      } else {
        sourcePigTag = null;
      }
    }

    const baseData = {
      name,
      description,
      price: new Prisma.Decimal(Number(priceStr).toFixed(2)),
      discountPercent: new Prisma.Decimal(discountPercentNum.toFixed(2)),
      discountPrice:
        discountPriceNum !== null ? new Prisma.Decimal(discountPriceNum.toFixed(2)) : null,
      discountLabel,
      discountEndsAt:
        discountEndsAt && !Number.isNaN(discountEndsAt.getTime()) ? discountEndsAt : null,
      stock,
      category:
        category ||
        existing.category ||
        (storeSection === "ANIMAL_FOOD" ? "Animal Feed" : "Livestock"),
      storeSection,
      imageUrl,
      pigId: pigIdRaw,
      sourcePigTag,
    };

    try {
      await prisma.storeProduct.update({
        where: { id: productId },
        data: { ...baseData, isNegotiable },
      });
    } catch (colErr) {
      const msg = colErr instanceof Error ? colErr.message : "";
      if (/is_negotiable/i.test(msg)) {
        await prisma.storeProduct.update({ where: { id: productId }, data: baseData });
      } else {
        throw colErr;
      }
    }

    if (stock === 0 && existing.stock > 0) {
      await notifyManagersStockedOut(name, productId, "Manager Stock Update");
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "UPDATED",
        entity: "STORE_PRODUCT",
        entityId: productId,
        previousValue: {
          name: existing.name,
          description: existing.description,
          storeSection: existing.storeSection,
          price: existing.price.toString(),
          isNegotiable: Boolean((existing as { isNegotiable?: boolean }).isNegotiable),
          discountPercent: existing.discountPercent?.toString() ?? "0",
          discountPrice: existing.discountPrice ? existing.discountPrice.toString() : null,
          stock: existing.stock,
          category: existing.category,
          imageUrl: existing.imageUrl,
          sourcePigTag: existing.sourcePigTag ?? null,
        },
        newValue: {
          name,
          description,
          storeSection,
          price: Number(priceStr).toFixed(2),
          isNegotiable,
          discountPercent: discountPercentNum,
          discountPrice: discountPriceNum,
          discountLabel,
          stock,
          category: baseData.category,
          imageUrl,
          pigId: pigIdRaw,
          sourcePigTag,
        },
      },
    });

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/history");
    revalidatePath("/store");
    return { success: true };
  } catch (err) {
    console.error("Failed to update store product:", err);
    return { success: false, error: "Failed to update store product." };
  }
}

export async function deleteStoreProduct(productId: string) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };
  if (!productId) return { success: false, error: "Missing product ID." };

  try {
    const existing = await prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!existing) return { success: false, error: "Product not found." };

    // Detach any historical references safely before deleting so order/report history remains intact
    await Promise.all([
      prisma.storeOrderItem
        .updateMany({ where: { productId }, data: { productId: null } })
        .catch(() => undefined),
      prisma.cooperativeStockReport
        .updateMany({ where: { listedProductId: productId }, data: { listedProductId: null } })
        .catch(() => undefined),
      prisma.cellFeedSale
        .updateMany({ where: { productId }, data: { productId: null } })
        .catch(() => undefined),
    ]);

    await prisma.storeProduct.delete({ where: { id: productId } });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "DELETED",
        entity: "STORE_PRODUCT",
        entityId: productId,
        previousValue: {
          name: existing.name,
          description: existing.description,
          storeSection: existing.storeSection,
          price: existing.price.toString(),
          isNegotiable: Boolean((existing as { isNegotiable?: boolean }).isNegotiable),
          discountPercent: existing.discountPercent?.toString() ?? "0",
          stock: existing.stock,
          category: existing.category,
          imageUrl: existing.imageUrl,
          sourcePigTag: existing.sourcePigTag ?? null,
        },
        newValue: {
          deleted: true,
          name: existing.name,
          deletedBy: actor.name,
        },
      },
    });

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/history");
    revalidatePath("/store");
    return { success: true };
  } catch (err) {
    console.error("Failed to delete store product:", err);
    return { success: false, error: "Failed to delete product from stock." };
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

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/history");
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

    if (stock === 0 && product.stock > 0) {
      await notifyManagersStockedOut(product.name, product.id, "Manual Stock Update");
    }

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

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/history");
    revalidatePath("/store");
    return { success: true };
  } catch (err) {
    console.error("Failed to update stock:", err);
    return { success: false, error: "Failed to update stock." };
  }
}

export async function updateProductPricingAndDiscount(params: {
  productId: string;
  price: number;
  stock: number;
  isNegotiable?: boolean;
  discountPercent: number;
  discountPrice: number | null;
  discountLabel: string | null;
  discountEndsAt: string | null;
}) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) return { success: false, error: "Unauthorized" };

  const {
    productId,
    price,
    stock,
    isNegotiable,
    discountPercent,
    discountPrice,
    discountLabel,
    discountEndsAt,
  } = params;

  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: "Base price must be greater than 0 RWF." };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { success: false, error: "Stock must be a non-negative integer." };
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 90) {
    return { success: false, error: "Discount % must be between 0 and 90." };
  }
  if (discountPrice !== null && (discountPrice <= 0 || discountPrice >= price)) {
    return { success: false, error: "Promo discount price must be positive and below base price." };
  }

  try {
    const existing = await prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!existing) return { success: false, error: "Product not found." };

    const parsedEndsAt = discountEndsAt ? new Date(`${discountEndsAt}T23:59:59.000Z`) : null;
    const updatePayload = {
      price: new Prisma.Decimal(price.toFixed(2)),
      stock,
      discountPercent: new Prisma.Decimal(discountPercent.toFixed(2)),
      discountPrice:
        discountPrice !== null ? new Prisma.Decimal(discountPrice.toFixed(2)) : null,
      discountLabel: discountLabel?.trim() || null,
      discountEndsAt:
        parsedEndsAt && !Number.isNaN(parsedEndsAt.getTime()) ? parsedEndsAt : null,
    };

    try {
      await prisma.storeProduct.update({
        where: { id: productId },
        data: {
          ...updatePayload,
          ...(typeof isNegotiable === "boolean" ? { isNegotiable } : {}),
        },
      });
    } catch (colErr) {
      const msg = colErr instanceof Error ? colErr.message : "";
      if (/is_negotiable/i.test(msg)) {
        await prisma.storeProduct.update({
          where: { id: productId },
          data: updatePayload,
        });
      } else {
        throw colErr;
      }
    }

    if (stock === 0 && existing.stock > 0) {
      await notifyManagersStockedOut(existing.name, existing.id, "Manager Stock Update");
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "PRICING_AND_DISCOUNT_UPDATED",
        entity: "STORE_PRODUCT",
        entityId: productId,
        previousValue: {
          price: existing.price.toString(),
          stock: existing.stock,
          discountPercent: existing.discountPercent?.toString() ?? "0",
        },
        newValue: {
          price: price.toFixed(2),
          stock,
          isNegotiable: typeof isNegotiable === "boolean" ? isNegotiable : undefined,
          discountPercent,
          discountPrice,
          discountLabel,
        },
      },
    });

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/history");
    revalidatePath("/store");
    return { success: true };
  } catch (err) {
    console.error("Failed to update product pricing/discount:", err);
    return { success: false, error: "Failed to update pricing & discount." };
  }
}

export async function submitCooperativeStockReport(formData: FormData) {
  const actor = await getActiveUser([
    Role.CELL_MANAGER,
    Role.SUPER_ADMIN,
  ]);
  if (!actor) return { success: false, error: "Unauthorized: Only Cell Managers can submit cooperative stock reports." };

  const cooperativeOwnerName = String(formData.get("cooperativeOwnerName") || "").trim();
  const cooperativeOwnerRole =
    String(formData.get("cooperativeOwnerRole") || "COOPERATIVE_MEMBER").trim();
  const cellName = String(formData.get("cellName") || "").trim();
  const animalTitle = String(formData.get("animalTitle") || "").trim();
  const pigCount = Number.parseInt(String(formData.get("pigCount") || "1"), 10);
  const weightRaw = String(formData.get("estimatedWeightKg") || "").trim();
  const priceRaw = String(formData.get("suggestedPrice") || "").trim();
  const pigId = String(formData.get("pigId") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!cooperativeOwnerName || !cellName || !animalTitle) {
    return { success: false, error: "Owner name, cell name, and animal description are required." };
  }
  if (!Number.isInteger(pigCount) || pigCount < 1) {
    return { success: false, error: "Animal stock count must be at least 1." };
  }

  let sourcePigTag: string | null = null;
  if (pigId) {
    const pig = await prisma.pig.findUnique({
      where: { id: pigId },
      select: { tagNumber: true },
    });
    sourcePigTag = pig?.tagNumber ?? null;
  }

  try {
    const report = await prisma.cooperativeStockReport.create({
      data: {
        reportedById: actor.id,
        reportedByName: actor.name,
        cooperativeOwnerName,
        cooperativeOwnerRole,
        cellName,
        animalTitle,
        pigCount,
        estimatedWeightKg:
          weightRaw && !Number.isNaN(Number(weightRaw))
            ? new Prisma.Decimal(Number(weightRaw).toFixed(2))
            : null,
        suggestedPrice:
          priceRaw && !Number.isNaN(Number(priceRaw))
            ? new Prisma.Decimal(Number(priceRaw).toFixed(2))
            : null,
        pigId,
        sourcePigTag,
        notes,
        status: "PENDING",
      },
    });

    // Notify Project Manager (Gebyian) & Super Admins to set official stock, price & discount on Gebyian Network
    const managers = await prisma.user.findMany({
      where: {
        role: { in: [Role.PROJECT_MANAGER, Role.SUPER_ADMIN] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          type: NotificationType.INFO,
          title: `Gebyian Network Stock Report (${cellName})`,
          message: `${actor.name} reported ${pigCount}x "${animalTitle}" from ${cooperativeOwnerName} (${cooperativeOwnerRole.replace(/_/g, " ")}) ready for Project Manager (Gebyian) pricing & listing.`,
          relatedEntity: "COOPERATIVE_STOCK_REPORT",
          relatedEntityId: report.id,
        })),
      });
    }

    revalidatePath("/dashboard/field/stock-reports");
    revalidatePath("/dashboard/admin/ecommerce");
    return { success: true };
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return {
        success: false,
        error: "Run update.sql in Supabase SQL Editor first to enable cooperative_stock_reports.",
      };
    }
    console.error("Failed to submit cooperative stock report:", err);
    return { success: false, error: "Failed to submit animal stock report." };
  }
}

export async function rejectCooperativeStockReport(reportId: string) {
  const actor = await getActiveUser([Role.PROJECT_MANAGER, Role.SUPER_ADMIN]);
  if (!actor) return { success: false, error: "Unauthorized" };

  try {
    await prisma.cooperativeStockReport.update({
      where: { id: reportId },
      data: {
        status: "REJECTED",
        reviewedById: actor.id,
      },
    });

    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/field/stock-reports");
    return { success: true };
  } catch (err) {
    console.error("Failed to reject cooperative stock report:", err);
    return { success: false, error: "Failed to update stock report." };
  }
}

export async function recordCellFeedSale(formData: FormData) {
  const actor = await getActiveUser([Role.CELL_MANAGER, Role.PROJECT_MANAGER, Role.SUPER_ADMIN]);
  if (!actor) return { success: false, error: "Unauthorized" };

  const productId = String(formData.get("productId") || "").trim();
  const buyerName = String(formData.get("buyerName") || "").trim();
  const buyerPhone = String(formData.get("buyerPhone") || "").trim() || null;
  const cellName = String(formData.get("cellName") || "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") || "Cash").trim();
  const quantity = Number.parseInt(String(formData.get("quantity") || "1"), 10);
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!productId || !buyerName) {
    return { success: false, error: "Feed product and buyer name are required." };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "Quantity must be at least 1." };
  }

  try {
    const product = await prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!product || !product.isAvailable) {
      return { success: false, error: "Selected animal food product is unavailable." };
    }
    if (product.stock < quantity) {
      return {
        success: false,
        error: `Insufficient feed stock for "${product.name}" (available: ${product.stock}).`,
      };
    }

    const pricing = getEffectiveProductPrice(product);
    const unitPrice = new Prisma.Decimal(pricing.effectivePrice.toFixed(2));
    const totalAmount = unitPrice.mul(quantity);
    const saleNumber = `FEED-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const remainingFeedStock = Math.max(0, product.stock - quantity);
    await prisma.storeProduct.update({
      where: { id: product.id },
      data: { stock: remainingFeedStock },
    });

    if (remainingFeedStock === 0) {
      await notifyManagersStockedOut(
        product.name,
        product.id,
        `Cell Feed Sale ${saleNumber} by ${actor.name}`
      );
    }

    const finTx = await prisma.financeTransaction.create({
      data: {
        transactionId: saleNumber,
        type: FinanceType.INCOME,
        amount: totalAmount,
        reference: "Animal Feed Sales",
        description: `Cell Feed Sale ${saleNumber}: ${quantity}x ${product.name} to ${buyerName}${
          cellName ? ` (${cellName})` : ""
        }${pricing.hasActiveDiscount ? ` [Discount ${pricing.discountPercentApplied}% applied]` : ""}`,
        paymentMethod,
        recordedById: actor.id,
        transactionDate: new Date(),
        status: FinanceStatus.SUBMITTED,
      },
    });

    const sale = await prisma.cellFeedSale.create({
      data: {
        saleNumber,
        productId: product.id,
        productName: product.name,
        buyerName,
        buyerPhone,
        quantity,
        unitPrice,
        totalAmount,
        paymentMethod,
        soldById: actor.id,
        soldByName: actor.name,
        cellName,
        financeTransactionId: finTx.transactionId,
        verificationStatus: "PENDING",
        notes,
      },
    });

    // Notify Finance Officer / Super Admin for verification
    const financeUsers = await prisma.user.findMany({
      where: {
        role: { in: [Role.FINANCE_OFFICER, Role.SUPER_ADMIN] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (financeUsers.length > 0) {
      await prisma.notification.createMany({
        data: financeUsers.map((acc) => ({
          userId: acc.id,
          type: NotificationType.INFO,
          title: `Feed Sale Verification Needed (${saleNumber})`,
          message: `Cell Manager ${actor.name} sold ${quantity}x ${product.name} to ${buyerName} for ${totalAmount.toString()} RWF (${paymentMethod}). Please verify in Finance.`,
          relatedEntity: "CELL_FEED_SALE",
          relatedEntityId: sale.id,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: "CELL_FEED_SALE_RECORDED",
        entity: "CELL_FEED_SALE",
        entityId: sale.id,
        newValue: {
          saleNumber,
          productName: product.name,
          quantity,
          totalAmount: totalAmount.toString(),
          cellName,
        },
      },
    });

    revalidatePath("/dashboard/field/feed-sales");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/finance");
    return { success: true, saleNumber };
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return {
        success: false,
        error: "Run update.sql in Supabase SQL Editor first to enable cell_feed_sales.",
      };
    }
    console.error("Failed to record cell feed sale:", err);
    return { success: false, error: "Failed to record animal food sale." };
  }
}

export async function verifyCellFeedSale(saleId: string, decision: "VERIFIED" | "REJECTED") {
  const actor = await getActiveUser([Role.FINANCE_OFFICER, Role.SUPER_ADMIN]);
  if (!actor) return { success: false, error: "Unauthorized" };

  try {
    const sale = await prisma.cellFeedSale.findUnique({ where: { id: saleId } });
    if (!sale) return { success: false, error: "Feed sale record not found." };
    if (sale.verificationStatus !== "PENDING") {
      return { success: false, error: "This sale has already been processed." };
    }

    await prisma.cellFeedSale.update({
      where: { id: sale.id },
      data: {
        verificationStatus: decision,
        verifiedById: actor.id,
        verifiedAt: new Date(),
      },
    });

    if (sale.financeTransactionId) {
      const finTx = await prisma.financeTransaction.findUnique({
        where: { transactionId: sale.financeTransactionId },
      });
      if (finTx) {
        await prisma.financeTransaction.update({
          where: { id: finTx.id },
          data: {
            status:
              decision === "VERIFIED" ? FinanceStatus.APPROVED : FinanceStatus.REJECTED,
            approvedById: actor.id,
            approvedAt: new Date(),
          },
        });
      }
    }

    // Restore feed stock if rejected
    if (decision === "REJECTED" && sale.productId) {
      const product = await prisma.storeProduct.findUnique({ where: { id: sale.productId } });
      if (product) {
        await prisma.storeProduct.update({
          where: { id: product.id },
          data: { stock: product.stock + sale.quantity },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        role: actor.role,
        action: `CELL_FEED_SALE_${decision}`,
        entity: "CELL_FEED_SALE",
        entityId: sale.id,
        newValue: { saleNumber: sale.saleNumber, decision, totalAmount: sale.totalAmount.toString() },
      },
    });

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/reports");
    revalidatePath("/dashboard/admin/finance");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/field/feed-sales");
    return { success: true };
  } catch (err) {
    console.error("Failed to verify cell feed sale:", err);
    return { success: false, error: "Verification failed." };
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

    revalidatePath("/dashboard/gebyian");
    revalidatePath("/dashboard/admin/ecommerce");
    revalidatePath("/dashboard/admin/ecommerce/animals");
    revalidatePath("/dashboard/admin/ecommerce/animal-food");
    revalidatePath("/dashboard/admin/ecommerce/animals-orders");
    revalidatePath("/dashboard/admin/ecommerce/animal-food-orders");
    revalidatePath(`/dashboard/admin/ecommerce/${orderId}`);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/finance");
    revalidatePath("/dashboard/finance");
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
                storeSection: true,
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
