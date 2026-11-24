import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import { ArrowLeft, Mail, MapPin, Phone, Receipt, ShoppingBag, Tag } from "lucide-react";
import { getActiveUser } from "@/lib/active-user";
import { getStoreOrderDetail } from "@/app/actions/ecommerce";
import { formatRwf } from "@/lib/format-rwf";
import { OrderDetailControls } from "@/components/admin/OrderDetailControls";

export const dynamic = "force-dynamic";

export default async function AdminEcommerceOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.PROJECT_MANAGER]);
  if (!actor) redirect("/dashboard");

  const { orderId } = await params;
  const detail = await getStoreOrderDetail(orderId);
  if (!detail) notFound();

  const { order, financeRows } = detail;
  const items = order.items ?? [];

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/admin/ecommerce"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Gebyian Network Control</span>
        </Link>

        <OrderDetailControls orderId={order.id} initialStatus={order.status} />
      </div>

      {/* Receipt Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
              Official Order Receipt
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#101827]">{order.orderNumber}</h1>
            <p className="mt-1 text-xs text-slate-500">
              Placed on {format(new Date(order.createdAt), "MMM d, yyyy 'at' HH:mm")}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#FF8A00]">
              <ShoppingBag className="h-3.5 w-3.5" />
              {order.status}
            </span>
            <p className="mt-2 text-xs text-slate-500">
              Payment: <span className="font-semibold text-slate-800">{order.paymentMethod || "Mobile Money"}</span>
            </p>
            {order.paymentReference && (
              <p className="text-xs text-slate-500">
                Ref: <span className="font-mono text-slate-800">{order.paymentReference}</span>
              </p>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Customer Details</p>
            <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
            {order.customerPhone && (
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {order.customerPhone}
              </p>
            )}
            {order.customerEmail && (
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {order.customerEmail}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery &amp; Notes</p>
            <p className="flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{order.shippingAddress || "Farm Pickup / Coordinates to be confirmed"}</span>
            </p>
            {order.notes && <p className="text-xs text-slate-500 pt-1">{order.notes}</p>}
          </div>
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">Herd Tag / SKU</th>
                <th className="px-3 py-2.5">Unit Price</th>
                <th className="px-3 py-2.5">Qty</th>
                <th className="px-3 py-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const lineTotal = Number(item.price.toString()) * item.quantity;
                return (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {item.product?.name || "Catalog Product"}
                      {item.product?.category && (
                        <span className="block text-[11px] font-normal text-slate-500">
                          {item.product.category}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {item.product?.sourcePigTag ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#FF8A00]">
                          <Tag className="h-3 w-3" />
                          {item.product.sourcePigTag}
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard SKU</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatRwf(item.price)}</td>
                    <td className="px-3 py-3 text-slate-700">{item.quantity}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {formatRwf(lineTotal)}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    No itemized breakdown stored on this order.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              {Number(order.discountTotal ?? 0) > 0 && (
                <>
                  <tr className="border-t border-slate-200 bg-slate-50/40">
                    <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                      Subtotal
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                      {formatRwf(order.subtotalAmount ?? order.totalAmount)}
                    </td>
                  </tr>
                  <tr className="bg-orange-50/50">
                    <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-[#FF8A00]">
                      Discount Applied
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-[#FF8A00]">
                      -{formatRwf(order.discountTotal ?? 0)}
                    </td>
                  </tr>
                </>
              )}
              <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                <td colSpan={4} className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-600">
                  Total Order Amount
                </td>
                <td className="px-3 py-3 text-right text-base font-bold text-[#FF8A00]">
                  {formatRwf(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Finance Reconciliation */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Receipt className="h-4 w-4 text-[#FF8A00]" />
            <span>Finance Ledger Reconciliation</span>
          </div>
          {financeRows.length === 0 ? (
            <p className="text-xs text-slate-500">
              No FinanceTransaction entry posted yet (auto-posted when status becomes PAID or COMPLETED).
            </p>
          ) : (
            <div className="space-y-1.5">
              {financeRows.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900">{tx.transactionId}</span>
                    <span className="ml-2 text-slate-500">{tx.reference}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        tx.type === "INCOME"
                          ? "bg-orange-50 text-[#FF8A00]"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-semibold text-slate-900">{formatRwf(tx.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
