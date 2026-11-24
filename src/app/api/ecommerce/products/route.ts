import { NextRequest } from "next/server";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getEffectiveProductPrice } from "@/lib/ecommerce-pricing";
import { handleCorsPreflight, jsonWithCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.trim();
    const section = searchParams.get("section")?.trim().toUpperCase();
    const inStockOnly = searchParams.get("inStockOnly") === "true" || searchParams.get("includeOutOfStock") === "false";

    const rows = await prisma.storeProduct.findMany({
      where: {
        isAvailable: true,
        ...(inStockOnly ? { stock: { gt: 0 } } : {}),
        ...(category && category !== "ALL" ? { category } : {}),
        ...(section === "ANIMALS" || section === "ANIMAL_FOOD" ? { storeSection: section } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    const products = [...rows].sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return 0;
    });

    return jsonWithCors({
      success: true,
      tableMissing: false,
      products: products.map((p) => {
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
          discountLabel: pricing.discountLabel,
          discountEndsAt: pricing.discountEndsAt,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold ?? 3,
          category: p.category || "General",
          storeSection: p.storeSection || "ANIMALS",
          imageUrl: p.imageUrl,
          sourcePigTag: p.sourcePigTag ?? null,
          createdAt: p.createdAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      return jsonWithCors({
        success: true,
        tableMissing: true,
        products: [],
      });
    }
    console.error("E-Commerce products GET error:", err);
    return jsonWithCors({ error: "Failed to load store products." }, { status: 500 });
  }
}
