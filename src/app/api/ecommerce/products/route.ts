import { NextRequest, NextResponse } from "next/server";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { getEffectiveProductPrice } from "@/lib/ecommerce-pricing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.trim();
    const section = searchParams.get("section")?.trim().toUpperCase();
    const includeOutOfStock = searchParams.get("includeOutOfStock") === "true";

    const products = await prisma.storeProduct.findMany({
      where: {
        isAvailable: true,
        ...(includeOutOfStock ? {} : { stock: { gt: 0 } }),
        ...(category && category !== "ALL" ? { category } : {}),
        ...(section === "ANIMALS" || section === "ANIMAL_FOOD" ? { storeSection: section } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      tableMissing: false,
      products: products.map((p) => {
        const pricing = getEffectiveProductPrice(p);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price.toString(),
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
      return NextResponse.json({
        success: true,
        tableMissing: true,
        products: [],
      });
    }
    console.error("E-Commerce products GET error:", err);
    return NextResponse.json({ error: "Failed to load store products." }, { status: 500 });
  }
}
