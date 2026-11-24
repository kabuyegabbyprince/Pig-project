"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Receipt,
  ShoppingBag,
  Wheat,
} from "lucide-react";
import {
  recordCellFeedSale,
  type SerializedCellFeedSale,
  type SerializedStoreProduct,
} from "@/app/actions/ecommerce";
import { formatRwf } from "@/lib/format-rwf";

export function CellFeedSalesClient({
  feedProducts,
  sales,
  tableMissing,
}: {
  feedProducts: SerializedStoreProduct[];
  sales: SerializedCellFeedSale[];
  tableMissing: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [productId, setProductId] = useState(feedProducts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [cellName, setCellName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");

  const selectedProduct = useMemo(
    () => feedProducts.find((p) => p.id === productId) ?? null,
    [feedProducts, productId]
  );

  const estimatedTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    const qty = Math.max(0, Number.parseInt(quantity || "0", 10) || 0);
    return Number(selectedProduct.effectivePrice) * qty;
  }, [selectedProduct, quantity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("quantity", quantity);
    fd.append("buyerName", buyerName);
    fd.append("buyerPhone", buyerPhone);
    fd.append("cellName", cellName);
    fd.append("paymentMethod", paymentMethod);
    fd.append("notes", notes);

    startTransition(async () => {
      const res = await recordCellFeedSale(fd);
      if (!res.success) {
        setError(res.error || "Could not record animal food sale.");
        return;
      }
      setSuccess(
        `Animal food sale ${res.saleNumber} recorded! Finance Officer has been notified to verify the transaction.`
      );
      setQuantity("1");
      setBuyerName("");
      setBuyerPhone("");
      setNotes("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
          Part 2 · Cell Animal Food Distribution &amp; Sales
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#101827]">
          Sell Animal Food &amp; Feed
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Record local animal food sales from stock and pricing configured by the Project Manager (Gebyian) in Gebyian
          Network. Every sale is automatically queued for Finance Officer verification and reporting.
        </p>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Migration Required</p>
            <p className="text-xs mt-1">
              Execute <span className="font-mono font-semibold">update.sql</span> in Supabase SQL Editor to
              enable <span className="font-mono">cell_feed_sales</span> and animal food stock sync.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-[#101827] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#FF8A00] shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Record Feed Sale Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <Wheat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">Record Animal Food Sale</h2>
              <p className="text-xs text-slate-500">
                Stock is decremented immediately and sent to Finance for Finance Officer verification.
              </p>
            </div>
          </div>

          {feedProducts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              No <span className="font-semibold">ANIMAL_FOOD</span> products with available stock are currently
              published. Ask the Project Manager (Gebyian) or Super Admin to add and stock animal food products in
              Gebyian Network Control.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Animal Food Product (Manager-Stocked) *
                  </label>
                  <select
                    required
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  >
                    {feedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatRwf(p.effectivePrice)}
                        {p.hasActiveDiscount ? ` (-${p.discountPercent}% promo)` : ""} · {p.stock} in stock
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Quantity *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={selectedProduct?.stock ?? 1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="MTN MoMo">MTN MoMo</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Buyer / Farmer Name *
                  </label>
                  <input
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Habimana Eric"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Buyer Telephone
                  </label>
                  <input
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="0788..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Cell / Akagari
                  </label>
                  <input
                    value={cellName}
                    onChange={(e) => setCellName(e.target.value)}
                    placeholder="e.g. Nyabisindu Cell"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Notes / Receipt Reference
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment reference or delivery details..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#101827] focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Calculated Sale Total
                  </p>
                  <p className="text-xl font-extrabold text-[#101827]">{formatRwf(estimatedTotal)}</p>
                </div>
                <button
                  type="submit"
                  disabled={isPending || tableMissing || !selectedProduct}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50 cursor-pointer transition"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 text-[#FF8A00]" />
                  )}
                  <span>{isPending ? "Recording..." : "Submit Feed Sale"}</span>
                </button>
              </div>
            </>
          )}
        </form>

        {/* Available Feed Stock Card */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-[#101827] border-b border-slate-100 pb-2.5">
            Available Animal Food Stock ({feedProducts.length})
          </h3>
          {feedProducts.length === 0 ? (
            <p className="text-xs text-slate-500">No feed stock available.</p>
          ) : (
            <div className="space-y-2.5">
              {feedProducts.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-[#101827]">{p.name}</p>
                    <span className="font-bold text-[#FF8A00] shrink-0">{p.stock} left</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-semibold text-[#101827]">{formatRwf(p.effectivePrice)}</span>
                    {p.hasActiveDiscount && (
                      <span className="text-[11px] text-slate-400 line-through">
                        {formatRwf(p.price)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Cell Feed Sales Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#101827]">
              Recorded Animal Food Sales ({sales.length})
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Sale ID</th>
                <th className="px-4 py-3">Feed Product</th>
                <th className="px-4 py-3">Buyer &amp; Cell</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Total (RWF)</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Finance Officer Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-[#101827]">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No animal food sales recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-[#FF8A00]">{s.saleNumber}</td>
                    <td className="px-4 py-3 font-semibold">{s.productName}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.buyerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {s.cellName || "Cell N/A"} {s.buyerPhone ? `· ${s.buyerPhone}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold">{s.quantity}</td>
                    <td className="px-4 py-3 font-bold text-[#101827]">{formatRwf(s.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{s.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          s.verificationStatus === "VERIFIED"
                            ? "bg-slate-100 text-[#101827]"
                            : s.verificationStatus === "REJECTED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-orange-50 text-[#FF8A00]"
                        }`}
                      >
                        {s.verificationStatus === "PENDING"
                          ? "Awaiting Finance Officer"
                          : s.verificationStatus === "VERIFIED"
                          ? "Verified"
                          : "Rejected"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
