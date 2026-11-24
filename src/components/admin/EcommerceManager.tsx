"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  ExternalLink,
  Loader2,
  Package,
  Percent,
  Plus,
  ShoppingBag,
  Tag,
  ToggleLeft,
  ToggleRight,
  Wheat,
  XCircle,
} from "lucide-react";
import {
  createStoreProduct,
  rejectCooperativeStockReport,
  toggleProductAvailability,
  updateProductPricingAndDiscount,
  updateStoreOrderStatus,
  type EcommerceOverviewData,
  type SerializedStockReport,
  type SerializedStoreProduct,
} from "@/app/actions/ecommerce";
import { formatRwf } from "@/lib/format-rwf";

const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
] as const;

export function EcommerceManager({
  initialData,
  sqlMigration,
}: {
  initialData: EcommerceOverviewData;
  sqlMigration: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<"ALL" | "ANIMALS" | "ANIMAL_FOOD">("ALL");

  // Prefill state when converting a Cell Manager Cooperative Stock Report into a store listing
  const [prefillReport, setPrefillReport] = useState<SerializedStockReport | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<
    Record<
      string,
      {
        price: string;
        stock: string;
        discountPercent: string;
        discountPrice: string;
        discountLabel: string;
        discountEndsAt: string;
      }
    >
  >({});

  const openEditor = (product: SerializedStoreProduct) => {
    if (editingProductId === product.id) {
      setEditingProductId(null);
      return;
    }
    setEditDrafts((prev) => ({
      ...prev,
      [product.id]: {
        price: product.price,
        stock: String(product.stock),
        discountPercent: String(product.discountPercent || 0),
        discountPrice: product.discountPrice || "",
        discountLabel: product.discountLabel || "",
        discountEndsAt: product.discountEndsAt ? product.discountEndsAt.slice(0, 10) : "",
      },
    }));
    setEditingProductId(product.id);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlMigration);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage({ type: "err", text: "Clipboard copy blocked by browser." });
    }
  };

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await createStoreProduct(formData);
      if (res.success) {
        setMessage({ type: "ok", text: "Store product created and published to E-Commerce." });
        form.reset();
        setPrefillReport(null);
        setShowAddForm(false);
      } else {
        setMessage({ type: "err", text: res.error || "Failed to add product." });
      }
    });
  };

  const handleToggleProduct = (productId: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await toggleProductAvailability(productId);
      if (res.success) {
        setMessage({ type: "ok", text: "Product availability updated." });
      } else {
        setMessage({ type: "err", text: res.error || "Update failed." });
      }
    });
  };

  const handleSavePricingAndDiscount = (product: SerializedStoreProduct) => {
    setMessage(null);
    const draft = editDrafts[product.id];
    if (!draft) return;

    const price = Number(draft.price);
    const stock = Number.parseInt(draft.stock, 10);
    const discountPercent = Number(draft.discountPercent || 0);
    const discountPrice = draft.discountPrice.trim() ? Number(draft.discountPrice) : null;

    startTransition(async () => {
      const res = await updateProductPricingAndDiscount({
        productId: product.id,
        price,
        stock,
        discountPercent,
        discountPrice,
        discountLabel: draft.discountLabel.trim() || null,
        discountEndsAt: draft.discountEndsAt.trim() || null,
      });
      if (res.success) {
        setMessage({
          type: "ok",
          text: `Updated stock, price, and discount for "${product.name}".`,
        });
        setEditingProductId(null);
      } else {
        setMessage({ type: "err", text: res.error || "Update failed." });
      }
    });
  };

  const handleRejectReport = (reportId: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await rejectCooperativeStockReport(reportId);
      if (res.success) {
        setMessage({ type: "ok", text: "Cooperative stock report marked as rejected." });
      } else {
        setMessage({ type: "err", text: res.error || "Action failed." });
      }
    });
  };

  const handleOrderStatus = (orderId: string, status: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateStoreOrderStatus(orderId, status);
      if (res.success) {
        if (status === "PAID" || status === "COMPLETED") {
          setMessage({
            type: "ok",
            text: `Order marked ${status} and revenue synced to Finance Ledger.`,
          });
        } else if (status === "CANCELLED") {
          setMessage({
            type: "ok",
            text: `Order cancelled.${res.stockRestored ? " Stock restored." : ""}${
              res.refundReversed ? " Refund reversal posted to Finance Ledger." : ""
            }`,
          });
        } else {
          setMessage({ type: "ok", text: `Order status updated to ${status}.` });
        }
      } else {
        setMessage({ type: "err", text: res.error || "Order update failed." });
      }
    });
  };

  const filteredProducts = initialData.products.filter((p) =>
    sectionFilter === "ALL" ? true : p.storeSection === sectionFilter
  );
  const pendingReports = initialData.stockReports.filter((r) => r.status === "PENDING");

  if (initialData.tableMissing) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Database className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-amber-950">
                Setup Required: Create Shared E-Commerce Tables in Supabase
              </h2>
              <p className="mt-1 text-sm text-amber-900/90">
                Run the SQL script below (also saved in <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">update.sql</code>) inside your Supabase SQL Editor to enable{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">store_products</code> (Animals &amp; Animal Food + Discounts),{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">store_orders</code>,{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">cooperative_stock_reports</code>, and{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">cell_feed_sales</code>, then refresh this page.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#FF8A00]" /> : <Copy className="h-3.5 w-3.5 text-[#FF8A00]" />}
                  <span>{copied ? "SQL Copied" : "Copy Supabase SQL Migration"}</span>
                </button>
              </div>
              <pre className="mt-4 max-h-80 overflow-x-auto rounded-xl border border-amber-200/80 bg-slate-950 p-4 text-xs leading-relaxed text-orange-100">
                {sqlMigration}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            message.type === "ok"
              ? "border-orange-200 bg-orange-50 text-[#101827]"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Animals &amp; Feed SKUs</p>
          <p className="mt-1 text-2xl font-bold text-[#101827]">{initialData.products.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Coop Animal Stock Reports</p>
          <p className="mt-1 text-2xl font-bold text-[#FF8A00]">{pendingReports.length} pending</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Orders Needing Fulfillment</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{initialData.pendingOrdersCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Verified Store Revenue</p>
          <p className="mt-1 text-2xl font-bold text-[#FF8A00]">{formatRwf(initialData.totalRevenue)}</p>
        </div>
      </div>

      {/* Cooperative Animal Stock Reports from Cell Managers */}
      {initialData.stockReports.length > 0 && (
        <section id="coop-reports" className="scroll-mt-20 rounded-2xl border border-orange-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Cooperative Animal Stock Reports (From Cell Managers)
              </h2>
              <p className="text-xs text-slate-500">
                Cell Managers report when Cooperative Leaders or Members have pigs ready to sell. Project Manager (Gebyian) sets official stock, price &amp; discount, and publishes to Gebyian Network.
              </p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Animal / Breed</th>
                  <th className="px-3 py-2.5">Coop Owner</th>
                  <th className="px-3 py-2.5">Cell &amp; Reporter</th>
                  <th className="px-3 py-2.5">Count / Est. Price</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.stockReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-[#101827]">{rep.animalTitle}</p>
                      {rep.sourcePigTag && (
                        <span className="text-[11px] font-medium text-[#FF8A00]">
                          Tag: {rep.sourcePigTag}
                        </span>
                      )}
                      {rep.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{rep.notes}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{rep.cooperativeOwnerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {rep.cooperativeOwnerRole.replace(/_/g, " ")}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{rep.cellName}</p>
                      <p className="text-[11px] text-slate-500">By {rep.reportedByName}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-[#101827]">{rep.pigCount} animals</p>
                      {rep.suggestedPrice && (
                        <p className="text-[11px] text-slate-500">
                          Suggested: {formatRwf(rep.suggestedPrice)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          rep.status === "LISTED"
                            ? "bg-orange-50 text-[#FF8A00]"
                            : rep.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {rep.status === "PENDING" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setPrefillReport(rep);
                              setShowAddForm(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-[#101827] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1f2937]"
                          >
                            <CheckCircle2 className="h-3 w-3 text-[#FF8A00]" />
                            <span>Set Stock &amp; Price</span>
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRejectReport(rep.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Product Catalog Management */}
      <section id="catalog" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Gebyian Network Catalog: Animals &amp; Animal Food (Stock, Prices &amp; Discounts)
              </h2>
              <p className="text-xs text-slate-500">
                Project Manager (Gebyian) controls both divisions: Part 1 (Animals for buyer carts) and Part 2 (Animal Food sold by Cell Managers).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
              {(["ALL", "ANIMALS", "ANIMAL_FOOD"] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSectionFilter(sec)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    sectionFilter === sec
                      ? "bg-[#101827] text-white"
                      : "text-slate-600 hover:text-[#101827]"
                  }`}
                >
                  {sec === "ALL" ? "All" : sec === "ANIMALS" ? "Animals" : "Animal Food"}
                </button>
              ))}
            </div>
            <Link
              href="/store"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Preview Storefront</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setPrefillReport(null);
                setShowAddForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
            >
              <Plus className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>{showAddForm ? "Close Form" : "Add Product"}</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            key={prefillReport?.id || "new-product"}
            onSubmit={handleAddProduct}
            className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {prefillReport && <input type="hidden" name="reportId" value={prefillReport.id} />}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Marketplace Division *
              </label>
              <select
                name="storeSection"
                defaultValue={prefillReport ? "ANIMALS" : "ANIMALS"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="ANIMALS">Part 1: Animals / Livestock (Buyer Cart)</option>
                <option value="ANIMAL_FOOD">Part 2: Animal Food / Feed (Cell Manager Sales)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Product Name *
              </label>
              <input
                name="name"
                required
                defaultValue={prefillReport?.animalTitle || ""}
                placeholder="e.g. Healthy Weaned Piglet or Pig Starter Feed 50kg"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Base Price (RWF) *
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="1"
                required
                defaultValue={prefillReport?.suggestedPrice || ""}
                placeholder="45000"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Initial Stock *
              </label>
              <input
                name="stock"
                type="number"
                min="0"
                defaultValue={prefillReport ? String(prefillReport.pigCount) : "1"}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Discount % (0–90)
              </label>
              <input
                name="discountPercent"
                type="number"
                min="0"
                max="90"
                step="0.5"
                defaultValue="0"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Or Promo Price (RWF, Optional)
              </label>
              <input
                name="discountPrice"
                type="number"
                min="1"
                step="0.01"
                placeholder="Leave blank to use %"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Discount Badge / Label
              </label>
              <input
                name="discountLabel"
                placeholder="e.g. Cooperative Promo"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Discount End Date (Optional)
              </label>
              <input
                name="discountEndsAt"
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <input
                name="category"
                defaultValue={prefillReport ? "Livestock" : ""}
                placeholder="Livestock / Pork Products / Animal Feed / Supplies"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Link Cleared Pig Tag (Optional)
              </label>
              <select
                name="pigId"
                defaultValue={prefillReport?.pigId || ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              >
                <option value="">-- Non-tracked / General SKU --</option>
                {initialData.clearedPigs.map((pig) => (
                  <option key={pig.id} value={pig.id}>
                    {pig.tagNumber} {pig.breed ? `(${pig.breed})` : ""} — Vet Cleared
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Image URL (Optional)
              </label>
              <input
                name="imageUrl"
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Description
              </label>
              <input
                name="description"
                defaultValue={
                  prefillReport
                    ? `Sourced from ${prefillReport.cooperativeOwnerName} (${prefillReport.cellName})`
                    : ""
                }
                placeholder="Short product description visible to buyers"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" /> : null}
                <span>Save Product</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">Division</th>
                <th className="px-3 py-2.5">Price &amp; Discount</th>
                <th className="px-3 py-2.5">Stock</th>
                <th className="px-3 py-2.5 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No E-Commerce products in this section yet.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isEditing = editingProductId === product.id;
                  const draft = editDrafts[product.id];
                  return (
                    <>
                      <tr key={product.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">
                              {product.category || "General"}
                            </span>
                            {product.sourcePigTag && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#FF8A00]">
                                <Tag className="h-2.5 w-2.5" />
                                {product.sourcePigTag}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              product.storeSection === "ANIMAL_FOOD"
                                ? "bg-slate-100 text-[#101827]"
                                : "bg-orange-50 text-[#FF8A00]"
                            }`}
                          >
                            {product.storeSection === "ANIMAL_FOOD" ? "Animal Food" : "Animals"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {product.hasActiveDiscount ? (
                            <div>
                              <span className="font-bold text-[#FF8A00]">
                                {formatRwf(product.effectivePrice)}
                              </span>
                              <span className="ml-1.5 text-[11px] text-slate-400 line-through">
                                {formatRwf(product.price)}
                              </span>
                              <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-[#FF8A00]">
                                -{product.discountPercent}%
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {formatRwf(product.price)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-semibold ${
                              product.stock === 0
                                ? "text-rose-600"
                                : product.stock <= product.lowStockThreshold
                                  ? "text-[#FF8A00]"
                                  : "text-[#101827]"
                            }`}
                          >
                            {product.stock} units
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditor(product)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#101827] hover:bg-slate-100"
                            >
                              <Percent className="h-3 w-3 text-[#FF8A00]" />
                              <span>{isEditing ? "Close" : "Stock & Discount"}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleToggleProduct(product.id)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                product.isAvailable
                                  ? "bg-orange-50 text-[#FF8A00] hover:bg-orange-100"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {product.isAvailable ? (
                                <ToggleRight className="h-3.5 w-3.5" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5" />
                              )}
                              <span>{product.isAvailable ? "Published" : "Hidden"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isEditing && draft && (
                        <tr key={`${product.id}-edit`} className="bg-slate-50/90">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 items-end">
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                  Base Price (RWF)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(e) =>
                                    setEditDrafts((prev) => ({
                                      ...prev,
                                      [product.id]: { ...draft, price: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                  Stock Qty
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={draft.stock}
                                  onChange={(e) =>
                                    setEditDrafts((prev) => ({
                                      ...prev,
                                      [product.id]: { ...draft, stock: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                  Discount %
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="90"
                                  step="0.5"
                                  value={draft.discountPercent}
                                  onChange={(e) =>
                                    setEditDrafts((prev) => ({
                                      ...prev,
                                      [product.id]: { ...draft, discountPercent: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                  Promo Price (RWF)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Optional"
                                  value={draft.discountPrice}
                                  onChange={(e) =>
                                    setEditDrafts((prev) => ({
                                      ...prev,
                                      [product.id]: { ...draft, discountPrice: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                  Discount End Date
                                </label>
                                <input
                                  type="date"
                                  value={draft.discountEndsAt}
                                  onChange={(e) =>
                                    setEditDrafts((prev) => ({
                                      ...prev,
                                      [product.id]: { ...draft, discountEndsAt: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleSavePricingAndDiscount(product)}
                                  className="w-full rounded-md bg-[#101827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Part 2: Cell Manager Animal Food Sales Activity */}
      {initialData.feedSales.length > 0 && (
        <section id="feed-sales" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#101827]">
              <Wheat className="h-4.5 w-4.5 text-[#FF8A00]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Cell Manager Animal Food Sales (Part 2)
              </h2>
              <p className="text-xs text-slate-500">
                Field feed sales recorded by Cell Managers against Project Manager (Gebyian) stock and verified by Finance Officers.
              </p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Sale #</th>
                  <th className="px-3 py-2.5">Feed Product</th>
                  <th className="px-3 py-2.5">Cell Manager</th>
                  <th className="px-3 py-2.5">Buyer</th>
                  <th className="px-3 py-2.5">Total</th>
                  <th className="px-3 py-2.5 text-right">Finance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.feedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-semibold text-[#101827]">{sale.saleNumber}</td>
                    <td className="px-3 py-2.5">
                      {sale.productName} ({sale.quantity} units)
                    </td>
                    <td className="px-3 py-2.5">
                      {sale.soldByName} {sale.cellName ? `— ${sale.cellName}` : ""}
                    </td>
                    <td className="px-3 py-2.5">
                      {sale.buyerName} {sale.buyerPhone ? `(${sale.buyerPhone})` : ""}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[#101827]">
                      {formatRwf(sale.totalAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          sale.verificationStatus === "VERIFIED"
                            ? "bg-orange-50 text-[#FF8A00]"
                            : sale.verificationStatus === "REJECTED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {sale.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Orders Control */}
      <section id="orders" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
            <ShoppingBag className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#101827]">Gebyian Network Orders &amp; Revenue Control</h2>
            <p className="text-xs text-slate-500">
              Approve, dispatch, and complete orders. Paid orders post income to FinanceTransaction; cancelled orders restore stock and auto-post refund reversals when already paid.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Order #</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Finance Sync</th>
                <th className="px-3 py-2.5 text-right">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialData.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No customer orders placed yet. Orders created on the E-Commerce storefront appear here live.
                  </td>
                </tr>
              ) : (
                initialData.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/dashboard/admin/ecommerce/${order.id}`}
                        className="font-semibold text-[#FF8A00] hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-[10px] text-slate-400">View Receipt</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{order.customerName}</p>
                      <p className="text-[11px] text-slate-500">{order.customerPhone || order.customerEmail || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{order.itemCount} items</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{formatRwf(order.totalAmount)}</p>
                      {Number(order.discountTotal) > 0 && (
                        <p className="text-[10px] text-[#FF8A00]">
                          Saved {formatRwf(order.discountTotal)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {order.refundedToFinance ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Refund Reversed
                        </span>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            order.syncedToFinance
                              ? "bg-orange-50 text-[#FF8A00]"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {order.syncedToFinance ? "Synced to Ledger" : "Pending Payment"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <select
                        value={order.status}
                        disabled={isPending}
                        onChange={(e) => handleOrderStatus(order.id, e.target.value)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-[#FF8A00] focus:outline-none"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
