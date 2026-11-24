import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getEffectiveProductPrice } from "@/lib/ecommerce-pricing";
import { StorefrontClient, type StorefrontProduct } from "@/components/public/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function PublicStorePage() {
  let products: StorefrontProduct[] = [];
  let tableMissing = false;

  try {
    const rows = await prisma.storeProduct.findMany({
      where: { isAvailable: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    });
    products = rows.map((p) => {
      const pricing = getEffectiveProductPrice(p);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        effectivePrice: pricing.effectivePrice.toFixed(2),
        hasActiveDiscount: pricing.hasActiveDiscount,
        discountPercent: pricing.discountPercentApplied,
        discountLabel: pricing.discountLabel,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold ?? 3,
        category: p.category || "General",
        storeSection: p.storeSection === "ANIMAL_FOOD" ? "ANIMAL_FOOD" : "ANIMALS",
        imageUrl: p.imageUrl,
        sourcePigTag: p.sourcePigTag ?? null,
      };
    });
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      tableMissing = true;
    } else {
      throw err;
    }
  }

  return <StorefrontClient initialProducts={products} tableMissing={tableMissing} />;
}
