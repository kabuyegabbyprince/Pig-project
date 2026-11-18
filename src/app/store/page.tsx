import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
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
    products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      stock: p.stock,
      category: p.category || "General",
      imageUrl: p.imageUrl,
      sourcePigTag: p.sourcePigTag ?? null,
    }));
  } catch (err) {
    if (isSupabaseTableMissingError(err)) {
      tableMissing = true;
    } else {
      throw err;
    }
  }

  return <StorefrontClient initialProducts={products} tableMissing={tableMissing} />;
}
