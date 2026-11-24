"use client";

import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  ExternalLink,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Percent,
  Plus,
  ShoppingBag,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Wheat,
  X,
  XCircle,
} from "lucide-react";
import {
  createStoreProduct,
  deleteStoreProduct,
  rejectCooperativeStockReport,
  toggleProductAvailability,
  updateProductPricingAndDiscount,
  updateStoreOrderStatus,
  updateStoreProduct,
  type EcommerceOverviewData,
  type SerializedStockReport,
  type SerializedStoreProduct,
} from "@/app/actions/ecommerce";
import { GEBYIAN_WEBSITE_URL } from "@/lib/config";
import { formatRwf } from "@/lib/format-rwf";

const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type SerializedAlertItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedEntity: string | null;
  isRead: boolean;
  createdAt: string;
};

export function EcommerceManager({
  initialData,
  sqlMigration,
  fixedDivision,
  viewMode = "ALL",
  alerts = [],
}: {
  initialData: EcommerceOverviewData;
  sqlMigration: string;
  fixedDivision?: "ANIMALS" | "ANIMAL_FOOD";
  viewMode?: "ALL" | "STOCK" | "ALERTS_ORDERS";
  alerts?: SerializedAlertItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<"ALL" | "ANIMALS" | "ANIMAL_FOOD">(
    fixedDivision ?? "ALL"
  );

  // Prefill state when converting a Cell Manager Cooperative Stock Report into a store listing
  const [prefillReport, setPrefillReport] = useState<SerializedStockReport | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<
    Record<
      string,
      {
        price: string;
        stock: string;
        isNegotiable: boolean;
        discountPercent: string;
        discountPrice: string;
        discountLabel: string;
        discountEndsAt: string;
      }
    >
  >({});

  const openEditor = (product: SerializedStoreProduct) => {
    setEditImagePreviewUrl(null);
    setConfirmDeleteId(null);
    if (editingProductId === product.id) {
      setEditingProductId(null);
      return;
    }
    setEditDrafts((prev) => ({
      ...prev,
      [product.id]: {
        price: product.price,
        stock: String(product.stock),
        isNegotiable: product.isNegotiable,
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
        setMessage({ type: "ok", text: "Product saved and published to Gebyian Website." });
        form.reset();
        setImagePreviewUrl(null);
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
        isNegotiable: draft.isNegotiable,
        discountPercent,
        discountPrice,
        discountLabel: draft.discountLabel.trim() || null,
        discountEndsAt: draft.discountEndsAt.trim() || null,
      });
      if (res.success) {
        setMessage({
          type: "ok",
          text:
            stock === 0
              ? `Updated "${product.name}" (Stock = 0: marked STOCKED OUT and managers notified).`
              : `Updated stock, price, and discount for "${product.name}".`,
        });
        setEditingProductId(null);
      } else {
        setMessage({ type: "err", text: res.error || "Update failed." });
      }
    });
  };

  const handleFullUpdateProduct = (
    e: React.FormEvent<HTMLFormElement>,
    product: SerializedStoreProduct
  ) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const nextStock = Number.parseInt(String(formData.get("stock") || "0"), 10);
    const nextName = String(formData.get("name") || product.name).trim();
    startTransition(async () => {
      const res = await updateStoreProduct(formData);
      if (res.success) {
        setMessage({
          type: "ok",
          text:
            nextStock === 0
              ? `Updated "${nextName}" (Stock = 0: marked STOCKED OUT and managers notified). Logged in Activity History.`
              : `Updated "${nextName}" and recorded change in Activity History.`,
        });
        setEditingProductId(null);
        setEditImagePreviewUrl(null);
      } else {
        setMessage({ type: "err", text: res.error || "Failed to update product." });
      }
    });
  };

  const handleDeleteProduct = (product: SerializedStoreProduct) => {
    setMessage(null);
    startTransition(async () => {
      const res = await deleteStoreProduct(product.id);
      if (res.success) {
        setConfirmDeleteId(null);
        if (editingProductId === product.id) setEditingProductId(null);
        setMessage({
          type: "ok",
          text: `Deleted "${product.name}" from stock. Historical orders preserved & deletion logged in Activity History.`,
        });
      } else {
        setMessage({ type: "err", text: res.error || "Failed to delete product." });
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

  const activeDivision = fixedDivision ?? sectionFilter;
  const divisionProducts = fixedDivision
    ? initialData.products.filter((p) => p.storeSection === fixedDivision)
    : initialData.products;
  const filteredProducts =
    activeDivision === "ALL"
      ? divisionProducts
      : divisionProducts.filter((p) => p.storeSection === activeDivision);
  const stockedOutProducts = divisionProducts.filter((p) => p.stock === 0);
  const lowStockProducts = divisionProducts.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
  );
  const alertProducts = [...stockedOutProducts, ...lowStockProducts];
  const divisionOrders = fixedDivision
    ? initialData.orders.filter((o) => o.sections.includes(fixedDivision))
    : initialData.orders;
  const divisionPendingOrders = divisionOrders.filter(
    (o) => o.status === "PENDING" || o.status === "PAID" || o.status === "PROCESSING"
  ).length;
  const pendingReports = initialData.stockReports.filter((r) => r.status === "PENDING");
  const isStockView = viewMode === "ALL" || viewMode === "STOCK";
  const isAlertsOrdersView = viewMode === "ALL" || viewMode === "ALERTS_ORDERS";

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
          <p className="text-xs font-medium text-slate-500">
            {fixedDivision === "ANIMALS"
              ? "Animals SKUs"
              : fixedDivision === "ANIMAL_FOOD"
                ? "Animal Food SKUs"
                : "Animals & Feed SKUs"}
          </p>
          <p className="mt-1 text-2xl font-bold text-[#101827]">{divisionProducts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            {fixedDivision === "ANIMAL_FOOD"
              ? "Stocked Out Feed Items"
              : viewMode === "ALERTS_ORDERS"
                ? "Stocked Out / Low Alerts"
                : "Coop Animal Stock Reports"}
          </p>
          <p className="mt-1 text-2xl font-bold text-[#FF8A00]">
            {fixedDivision === "ANIMAL_FOOD" || viewMode === "ALERTS_ORDERS"
              ? `${stockedOutProducts.length} out / ${lowStockProducts.length} low`
              : `${pendingReports.length} pending`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Orders Needing Fulfillment</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{divisionPendingOrders}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Verified Store Revenue</p>
          <p className="mt-1 text-2xl font-bold text-[#FF8A00]">{formatRwf(initialData.totalRevenue)}</p>
        </div>
      </div>

      {/* Stocked-Out & Low Stock Alerts Panel (shown on ALERTS_ORDERS pages) */}
      {viewMode === "ALERTS_ORDERS" && (
        <section id="stock-alerts" className="scroll-mt-20 rounded-2xl border border-rose-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#101827]">
                  {fixedDivision === "ANIMAL_FOOD"
                    ? "Animal Food Stock Alerts (Stocked Out & Low Stock)"
                    : "Animals Stock Alerts (Stocked Out & Low Stock)"}
                </h2>
                <p className="text-xs text-slate-500">
                  Items at 0 units remain saved in the system marked STOCKED OUT so you can restock them immediately.
                </p>
              </div>
            </div>
            <Link
              href={
                fixedDivision === "ANIMAL_FOOD"
                  ? "/dashboard/admin/ecommerce/animal-food"
                  : "/dashboard/admin/ecommerce/animals"
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937]"
            >
              <span>
                Manage {fixedDivision === "ANIMAL_FOOD" ? "Animal Food" : "Animal"} Stock
              </span>
            </Link>
          </div>

          {alertProducts.length === 0 ? (
            <p className="py-4 text-xs text-slate-500">
              All {fixedDivision === "ANIMAL_FOOD" ? "animal food" : "animal"} items currently have healthy stock levels.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {alertProducts.map((product) => {
                const isEditing = editingProductId === product.id;
                const draft = editDrafts[product.id];
                return (
                  <div key={product.id} className="py-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {product.stock === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800 shrink-0">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            STOCKED OUT
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-[#FF8A00] shrink-0">
                            Only {product.stock} left
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#101827] truncate">{product.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatRwf(product.effectivePrice)}
                            {product.isNegotiable ? " · Bargainable" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditor(product)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#101827] hover:bg-slate-100"
                      >
                        <span>{isEditing ? "Close" : product.stock === 0 ? "Restock Now" : "Update Stock"}</span>
                      </button>
                    </div>
                    {isEditing && draft && (
                      <div className="grid gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4 items-end">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                            New Stock Qty
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
                            Price (RWF)
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
                            Discount % (Opt.)
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
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSavePricingAndDiscount(product)}
                          className="rounded-md bg-[#101827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50"
                        >
                          Save Restock
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Alerts Feed on ALERTS_ORDERS pages */}
      {viewMode === "ALERTS_ORDERS" && alerts.length > 0 && (
        <section id="alerts" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#101827]">Recent Order &amp; Stock Alerts</h2>
              <p className="text-[11px] text-slate-500">Live system notifications for Project Manager (Gebyian).</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.slice(0, 8).map((n) => (
              <div key={n.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[#101827]">{n.title}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">{n.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cooperative Animal Stock Reports from Cell Managers */}
      {isStockView && fixedDivision !== "ANIMAL_FOOD" && initialData.stockReports.length > 0 && (
        <section id="coop-reports" className="scroll-mt-20 rounded-2xl border border-orange-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                Cooperative Animal Stock Reports (Cell Manager Intake Only)
              </h2>
              <p className="text-xs text-slate-500">
                Only Cell Managers report when Cooperative Members or Leaders have animals ready to sell (Cooperative Members &amp; Admins cannot submit directly). Project Manager (Gebyian) sets official stock, bargainable price &amp; optional discounts.
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
      {isStockView && (
      <section id="catalog" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101827]">
                {fixedDivision === "ANIMALS"
                  ? "Part 1: Animals Stock, Prices & Discounts"
                  : fixedDivision === "ANIMAL_FOOD"
                    ? "Part 2: Animal Food & Feed Stock, Prices & Discounts"
                    : "Gebyian Network Catalog: Animals & Animal Food (Stock, Prices & Discounts)"}
              </h2>
              <p className="text-xs text-slate-500">
                {fixedDivision === "ANIMALS"
                  ? "Manage live pigs and livestock for public buyer carts on Gebyian Website."
                  : fixedDivision === "ANIMAL_FOOD"
                    ? "Manage animal food and feed stock distributed & sold by Cell Managers."
                    : "Project Manager (Gebyian) controls both divisions: Part 1 (Animals for buyer carts) and Part 2 (Animal Food sold by Cell Managers)."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!fixedDivision && (
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
            )}
            <a
              href={GEBYIAN_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Open Gebyian Website</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setPrefillReport(null);
                setImagePreviewUrl(null);
                setShowAddForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
            >
              <Plus className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>
                {showAddForm
                  ? "Close Form"
                  : fixedDivision === "ANIMALS"
                    ? "Add Animal Stock"
                    : fixedDivision === "ANIMAL_FOOD"
                      ? "Add Animal Food Stock"
                      : "Add Product / Stock"}
              </span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            key={prefillReport?.id || "new-product"}
            onSubmit={handleAddProduct}
            className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
          >
            {prefillReport && <input type="hidden" name="reportId" value={prefillReport.id} />}
            {fixedDivision && <input type="hidden" name="storeSection" value={fixedDivision} />}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#101827]">
                  {fixedDivision === "ANIMALS"
                    ? "Quick Add Animal & Stock to Gebyian Website"
                    : fixedDivision === "ANIMAL_FOOD"
                      ? "Quick Add Animal Food & Stock"
                      : "Quick Add Product & Stock to Gebyian Website"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Product name stays in the system permanently — when stock hits 0, it is marked STOCKED OUT and notifies you automatically.
                </p>
              </div>
              <span className="rounded-md bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-[#FF8A00]">
                Bucket: product-image
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {!fixedDivision && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Marketplace Division *
                  </label>
                  <select
                    name="storeSection"
                    defaultValue="ANIMALS"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
                  >
                    <option value="ANIMALS">Part 1: Animals / Livestock (Buyer Cart)</option>
                    <option value="ANIMAL_FOOD">Part 2: Animal Food / Feed (Cell Manager Sales)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Product Name *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={prefillReport?.animalTitle || ""}
                  placeholder="e.g. Healthy Weaned Piglet or Starter Feed 50kg"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Initial Stock Quantity *
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
                  Price Per Unit (RWF) *
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
                <label className="mt-1.5 inline-flex items-center gap-2 text-xs font-medium text-[#101827] cursor-pointer">
                  <input
                    type="checkbox"
                    name="isNegotiable"
                    defaultChecked={true}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FF8A00]"
                  />
                  <span>Bargainable price (buyers can negotiate)</span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Product Image (Upload from PC → Supabase product-image bucket)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00]">
                    <Upload className="h-3.5 w-3.5 text-[#FF8A00]" />
                    <span>Choose Photo from Computer</span>
                    <input
                      type="file"
                      name="image"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImagePreviewUrl(URL.createObjectURL(file));
                        } else {
                          setImagePreviewUrl(null);
                        }
                      }}
                    />
                  </label>
                  {imagePreviewUrl ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreviewUrl}
                        alt="Selected product preview"
                        className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                      />
                      <span className="text-[11px] font-medium text-emerald-700">Ready to upload</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">JPG, PNG, WebP (max 5 MB)</span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Description *
                </label>
                <input
                  name="description"
                  required
                  defaultValue={
                    prefillReport
                      ? `Sourced from ${prefillReport.cooperativeOwnerName} (${prefillReport.cellName})`
                      : ""
                  }
                  placeholder="Short description (age, weight, breed, bag size, delivery info)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
                />
              </div>
            </div>

            {/* Optional Discount & Traceability Details */}
            <details className="rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-xs font-bold text-[#101827] flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-[#FF8A00]" />
                <span>Add Discount (Optional) &amp; Extra Options</span>
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Discount % (0–90, Optional)
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
                    Or Fixed Promo Price (RWF, Optional)
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
                    Discount Label (Optional)
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
                    Category (Optional)
                  </label>
                  <input
                    name="category"
                    defaultValue={
                      prefillReport
                        ? "Livestock"
                        : fixedDivision === "ANIMAL_FOOD"
                          ? "Animal Feed"
                          : ""
                    }
                    placeholder={
                      fixedDivision === "ANIMAL_FOOD"
                        ? "Animal Feed / Supplements / Supplies"
                        : "Livestock / Pork Products"
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>
                {fixedDivision !== "ANIMAL_FOOD" && (
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
                )}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Or Paste External Image URL (Optional if no file chosen)
                  </label>
                  <input
                    name="imageUrl"
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF8A00] focus:outline-none"
                  />
                </div>
              </div>
            </details>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" /> : null}
                <span>Save &amp; Publish Product</span>
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
                  return (
                    <Fragment key={product.id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {product.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                                <ImagePlus className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{product.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-slate-500">
                                  {product.category || "General"}
                                </span>
                                {product.isNegotiable && (
                                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                    Bargainable
                                  </span>
                                )}
                                {product.sourcePigTag && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#FF8A00]">
                                    <Tag className="h-2.5 w-2.5" />
                                    {product.sourcePigTag}
                                  </span>
                                )}
                              </div>
                            </div>
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
                          {product.stock === 0 ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                STOCKED OUT
                              </span>
                              <p className="text-[10px] text-rose-600">Name saved — restock anytime</p>
                            </div>
                          ) : (
                            <span
                              className={`font-semibold ${
                                product.stock <= product.lowStockThreshold
                                  ? "text-[#FF8A00]"
                                  : "text-[#101827]"
                              }`}
                            >
                              {product.stock} units
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditor(product)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#101827] hover:bg-slate-100"
                            >
                              <Pencil className="h-3 w-3 text-[#FF8A00]" />
                              <span>{isEditing ? "Close" : product.stock === 0 ? "Restock / Edit" : "Edit"}</span>
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
                            {confirmDeleteId === product.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleDeleteProduct(product)}
                                  className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Confirm</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setConfirmDeleteId(product.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={5} className="px-4 py-4">
                            <form
                              key={`edit-${product.id}`}
                              onSubmit={(e) => handleFullUpdateProduct(e, product)}
                              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <input type="hidden" name="productId" value={product.id} />
                              {fixedDivision && (
                                <input type="hidden" name="storeSection" value={fixedDivision} />
                              )}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <p className="text-xs font-bold text-[#101827]">
                                  Edit Stock Item: {product.name}
                                </p>
                                <span className="text-[10px] font-medium text-slate-500">
                                  All edits are saved to Activity History
                                </span>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {!fixedDivision && (
                                  <div>
                                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                      Division *
                                    </label>
                                    <select
                                      name="storeSection"
                                      defaultValue={product.storeSection}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                    >
                                      <option value="ANIMALS">Animals (Buyer Cart)</option>
                                      <option value="ANIMAL_FOOD">Animal Food (Cell Sales)</option>
                                    </select>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Product Name *
                                  </label>
                                  <input
                                    name="name"
                                    required
                                    defaultValue={product.name}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Category
                                  </label>
                                  <input
                                    name="category"
                                    defaultValue={product.category || ""}
                                    placeholder={
                                      product.storeSection === "ANIMAL_FOOD"
                                        ? "Animal Feed"
                                        : "Livestock"
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Stock Qty *
                                  </label>
                                  <input
                                    name="stock"
                                    type="number"
                                    min="0"
                                    required
                                    defaultValue={String(product.stock)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Price Per Unit (RWF) *
                                  </label>
                                  <input
                                    name="price"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    required
                                    defaultValue={product.price}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                  <label className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#101827] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="isNegotiable"
                                      defaultChecked={product.isNegotiable}
                                      className="h-3.5 w-3.5 rounded accent-[#FF8A00]"
                                    />
                                    <span>Bargainable</span>
                                  </label>
                                </div>

                                <div className="sm:col-span-2 lg:col-span-2">
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Description
                                  </label>
                                  <input
                                    name="description"
                                    defaultValue={product.description || ""}
                                    placeholder="Product details, weight, breed or bag size"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-2">
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Replace Image (Local PC → product-image) or URL
                                  </label>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#101827] hover:border-[#FF8A00]">
                                      <Upload className="h-3 w-3 text-[#FF8A00]" />
                                      <span>Upload Photo</span>
                                      <input
                                        type="file"
                                        name="image"
                                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                                        className="sr-only"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setEditImagePreviewUrl(URL.createObjectURL(file));
                                          } else {
                                            setEditImagePreviewUrl(null);
                                          }
                                        }}
                                      />
                                    </label>
                                    {(editImagePreviewUrl || product.imageUrl) && (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img
                                        src={editImagePreviewUrl || product.imageUrl || ""}
                                        alt={product.name}
                                        className="h-8 w-8 rounded border border-slate-200 object-cover"
                                      />
                                    )}
                                    <input
                                      name="imageUrl"
                                      defaultValue={product.imageUrl || ""}
                                      placeholder="https://... (optional)"
                                      className="flex-1 min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Discount % (0–90)
                                  </label>
                                  <input
                                    name="discountPercent"
                                    type="number"
                                    min="0"
                                    max="90"
                                    step="0.5"
                                    defaultValue={String(product.discountPercent || 0)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Promo Price (RWF)
                                  </label>
                                  <input
                                    name="discountPrice"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    defaultValue={product.discountPrice || ""}
                                    placeholder="Optional"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Discount Label
                                  </label>
                                  <input
                                    name="discountLabel"
                                    defaultValue={product.discountLabel || ""}
                                    placeholder="e.g. Cooperative Promo"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                    Discount End Date
                                  </label>
                                  <input
                                    name="discountEndsAt"
                                    type="date"
                                    defaultValue={
                                      product.discountEndsAt
                                        ? product.discountEndsAt.slice(0, 10)
                                        : ""
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>

                                {fixedDivision !== "ANIMAL_FOOD" &&
                                  product.storeSection !== "ANIMAL_FOOD" && (
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                                        Linked Vet-Cleared Pig Tag
                                      </label>
                                      <select
                                        name="pigId"
                                        defaultValue={product.pigId || ""}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                      >
                                        <option value="">-- Non-tracked / General SKU --</option>
                                        {product.pigId &&
                                          !initialData.clearedPigs.some(
                                            (p) => p.id === product.pigId
                                          ) && (
                                            <option value={product.pigId}>
                                              {product.sourcePigTag || product.pigId} (Current Linked)
                                            </option>
                                          )}
                                        {initialData.clearedPigs.map((pig) => (
                                          <option key={pig.id} value={pig.id}>
                                            {pig.tagNumber} {pig.breed ? `(${pig.breed})` : ""} — Vet Cleared
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProductId(null);
                                    setEditImagePreviewUrl(null);
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-50"
                                >
                                  {isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" />
                                  ) : null}
                                  <span>Save All Changes</span>
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Part 2: Cell Manager Animal Food Sales Activity */}
      {isAlertsOrdersView && fixedDivision !== "ANIMALS" && initialData.feedSales.length > 0 && (
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
      {isAlertsOrdersView && (
      <section id="orders" className="scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
            <ShoppingBag className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#101827]">
              {fixedDivision === "ANIMALS"
                ? "Animals Orders & Revenue Control"
                : fixedDivision === "ANIMAL_FOOD"
                  ? "Animal Food Orders & Revenue Control"
                  : "Gebyian Network Orders & Revenue Control"}
            </h2>
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
              {divisionOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No customer orders placed in this section yet.
                  </td>
                </tr>
              ) : (
                divisionOrders.map((order) => (
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
      )}
    </div>
  );
}
