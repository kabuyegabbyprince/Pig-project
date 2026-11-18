import { NextRequest, NextResponse } from "next/server";
import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.trim();
    const includeOutOfStock = searchParams.get("includeOutOfStock") === "true";

    const products = await prisma.storeProduct.findMany({
      where: {
        isAvailable: true,
        ...(includeOutOfStock ? {} : { stock: { gt: 0 } }),
        ...(category && category !== "ALL" ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      tableMissing: false,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        stock: p.stock,
        category: p.category || "General",
        imageUrl: p.imageUrl,
        sourcePigTag: p.sourcePigTag ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
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
