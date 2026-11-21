"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  Database,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  ShoppingBag,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  createStoreProduct,
  toggleProductAvailability,
  updateProductStock,
  updateStoreOrderStatus,
  type EcommerceOverviewData,
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
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

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
        setMessage({ type: "ok", text: "Store product created successfully." });
        form.reset();
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

  const handleSaveStock = (productId: string, fallbackStock: number) => {
    setMessage(null);
    const val = Number.parseInt(stockDrafts[productId] ?? String(fallbackStock), 10);
    if (Number.isNaN(val) || val < 0) {
      setMessage({ type: "err", text: "Enter a valid stock quantity." });
      return;
    }
    startTransition(async () => {
      const res = await updateProductStock(productId, val);
      if (res.success) {
        setMessage({ type: "ok", text: "Product stock updated." });
      } else {
        setMessage({ type: "err", text: res.error || "Stock update failed." });
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
                Phase 2 Setup Required: Create Shared E-Commerce Tables in Supabase
              </h2>
              <p className="mt-1 text-sm text-amber-900/90">
                The Prisma schema and Super Admin E-Commerce Control UI are ready, but{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">store_products</code>,{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">store_orders</code>, and{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">store_order_items</code>{" "}
                have not yet been created in Supabase. Run the SQL below (which includes herd links and RLS policies) in your Supabase SQL Editor, then refresh this page.
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Catalog Products</p>
          <p className="mt-1 text-2xl font-bold text-[#101827]">{initialData.products.length}</p>
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

      {/* Product Catalog Management */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">Store Product Catalog</h2>
              <p className="text-xs text-slate-500">
                Create and control livestock &amp; farm products synced with the E-Commerce storefront.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/store"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Preview Storefront</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
            >
              <Plus className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>{showAddForm ? "Close Form" : "Add Product"}</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddProduct} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Product Name *
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Healthy Weaned Piglet"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Price (RWF) *
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="1"
                required
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
                defaultValue="1"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <input
                name="category"
                placeholder="Livestock / Pork / Feed / Training Guides"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Link Cleared Pig Tag (Optional)
              </label>
              <select
                name="pigId"
                defaultValue=""
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
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Herd Tag</th>
                <th className="px-3 py-2.5">Price</th>
                <th className="px-3 py-2.5">Stock</th>
                <th className="px-3 py-2.5 text-right">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialData.products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No E-Commerce products published yet.
                  </td>
                </tr>
              ) : (
                initialData.products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      {product.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{product.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{product.category || "General"}</td>
                    <td className="px-3 py-2.5">
                      {product.sourcePigTag ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#FF8A00]">
                          <Tag className="h-3 w-3" />
                          {product.sourcePigTag}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{formatRwf(product.price)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={stockDrafts[product.id] ?? String(product.stock)}
                          onChange={(e) =>
                            setStockDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))
                          }
                          className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSaveStock(product.id, product.stock)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Orders Control */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShoppingBag className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">E-Commerce Orders &amp; Revenue Control</h2>
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
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{formatRwf(order.totalAmount)}</td>
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
