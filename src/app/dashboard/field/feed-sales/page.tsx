import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getEffectiveProductPrice } from "@/lib/ecommerce-pricing";
import { CellFeedSalesClient } from "@/components/field/CellFeedSalesClient";
import type { SerializedCellFeedSale, SerializedStoreProduct } from "@/app/actions/ecommerce";

export const dynamic = "force-dynamic";

export default async function FieldFeedSalesPage() {
  const actor = await getActiveUser([
    Role.CELL_MANAGER,
    Role.PROJECT_MANAGER,
    Role.SUPER_ADMIN,
  ]);
  if (!actor) redirect("/dashboard");

  let tableMissing = false;
  let feedProducts: SerializedStoreProduct[] = [];
  let sales: SerializedCellFeedSale[] = [];

  try {
    const [productRows, saleRows] = await Promise.all([
      prisma.storeProduct.findMany({
        where: { isAvailable: true, stock: { gt: 0 }, storeSection: "ANIMAL_FOOD" },
        orderBy: { name: "asc" },
      }),
      prisma.cellFeedSale.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    feedProducts = productRows.map((p) => {
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
        storeSection: "ANIMAL_FOOD",
        imageUrl: p.imageUrl,
        isAvailable: p.isAvailable,
        pigId: p.pigId ?? null,
        sourcePigTag: p.sourcePigTag ?? null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    sales = saleRows.map((s) => ({
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
    }));
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      tableMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <CellFeedSalesClient
      feedProducts={feedProducts}
      sales={sales}
      tableMissing={tableMissing}
    />
  );
}
