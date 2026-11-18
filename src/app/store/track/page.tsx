import { prisma, isSupabaseTableMissingError } from "@/lib/prisma";
import { TrackOrderClient, type TrackedOrderData } from "@/components/public/TrackOrderClient";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.orderNumber?.trim().toUpperCase() || "";

  let initialOrder: TrackedOrderData | null = null;
  let initialError = "";

  if (orderNumber) {
    try {
      const found = await prisma.storeOrder.findUnique({
        where: { orderNumber },
        include: {
          items: {
            include: {
              product: { select: { name: true, category: true, sourcePigTag: true } },
            },
          },
        },
      });
      if (!found) {
        initialError = "Order not found.";
      } else {
        initialOrder = {
          orderNumber: found.orderNumber,
          status: found.status,
          customerName: found.customerName,
          totalAmount: found.totalAmount.toString(),
          paymentMethod: found.paymentMethod,
          paymentReference: found.paymentReference ?? null,
          shippingAddress: found.shippingAddress ?? null,
          createdAt: found.createdAt.toISOString(),
          items: (found.items ?? []).map((item) => ({
            name: item.product?.name || "Product",
            category: item.product?.category || "General",
            sourcePigTag: item.product?.sourcePigTag ?? null,
            quantity: item.quantity,
            price: item.price.toString(),
          })),
        };
      }
    } catch (err) {
      if (isSupabaseTableMissingError(err)) {
        initialError = "E-Commerce tables are not yet provisioned in Supabase.";
      } else {
        initialError = "Could not retrieve order details.";
      }
    }
  }

  return (
    <TrackOrderClient
      initialOrderNumber={orderNumber}
      initialOrder={initialOrder}
      initialError={initialError}
    />
  );
}
