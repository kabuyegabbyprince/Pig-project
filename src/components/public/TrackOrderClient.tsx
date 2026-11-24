"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { formatRwf } from "@/lib/format-rwf";

export type TrackedOrderData = {
  orderNumber: string;
  status: string;
  customerName: string;
  subtotalAmount?: string;
  discountTotal?: string;
  totalAmount: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  shippingAddress: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: Array<{
    name: string;
    category: string;
    storeSection?: string;
    sourcePigTag: string | null;
    quantity: number;
    originalPrice?: string;
    discountAmount?: string;
    price: string;
  }>;
};

const STAGES = [
  { key: "PENDING", label: "Order Placed", desc: "Awaiting payment & manager confirmation", icon: Clock },
  { key: "PAID", label: "Payment Verified", desc: "Payment received & logged", icon: CheckCircle2 },
  { key: "PROCESSING", label: "Prepped & Tagged", desc: "Ear-tagged & package assembled", icon: Package },
  { key: "DISPATCHED", label: "Out for Delivery", desc: "En route to delivery destination", icon: Truck },
  { key: "COMPLETED", label: "Delivered", desc: "Delivered and handover finalized", icon: PackageCheck },
];

export function TrackOrderClient({
  initialOrderNumber = "",
  initialOrder = null,
  initialError = "",
}: {
  initialOrderNumber?: string;
  initialOrder?: TrackedOrderData | null;
  initialError?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [order, setOrder] = useState<TrackedOrderData | null>(initialOrder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = orderNumber.trim().toUpperCase();
    if (!cleanNum) return;

    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const params = new URLSearchParams({ orderNumber: cleanNum });
      if (contact.trim()) params.set("contact", contact.trim());
      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order not found.");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Failed to look up order status.");
    } finally {
      setLoading(false);
    }
  };

  const getStageIndex = (status: string) => {
    switch (status) {
      case "PENDING":
        return 0;
      case "PAID":
        return 1;
      case "PROCESSING":
        return 2;
      case "DISPATCHED":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIdx = order ? getStageIndex(order.status) : 0;
  const isCancelled = order?.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#101827] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Pig Project Rwanda home"
            className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 border border-slate-200 shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] hover:bg-orange-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
              Gebyian Network Order Tracking
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#101827]">Track Your Order</h1>
            <p className="mt-1 text-xs text-slate-600">
              Enter your Order Number (e.g. <span className="font-mono font-semibold">ORD-2026-1234AB</span>) to view
              live payment verification, veterinary review, and delivery status managed by Project Manager (Gebyian).
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Order # (ORD-2026-...)"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono uppercase focus:border-[#FF8A00] focus:outline-none"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone or Email (optional)"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-[#FF8A00] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#101827] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1f2937] transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" />
              ) : (
                <Search className="h-3.5 w-3.5 text-[#FF8A00]" />
              )}
              <span>Check Status</span>
            </button>
          </form>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Details */}
          {order && (
            <div className="space-y-6 pt-2">
              {/* Order Header */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100/70 text-[#FF8A00]">
                      <PackageCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#101827] font-mono">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">
                        Customer: <span className="font-semibold text-slate-800">{order.customerName}</span> &bull; Placed on{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-RW", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isCancelled ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                        CANCELLED
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-3.5 py-1 text-xs font-bold text-[#FF8A00]">
                        {order.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cancelled Banner */}
                {isCancelled ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>This order has been cancelled.</span>
                    </p>
                    <p className="text-rose-700">
                      Inventory has been restored to the Gebyian Marketplace. If you believe this is an error or need
                      a refund, please contact the Gebyian Project Manager.
                    </p>
                  </div>
                ) : (
                  /* 5-Step Visual Timeline */
                  <div className="py-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {STAGES.map((s, idx) => {
                        const Icon = s.icon;
                        const isDone = idx < currentStageIdx;
                        const isCurrent = idx === currentStageIdx;
                        return (
                          <div
                            key={s.key}
                            className={`rounded-xl border p-3 flex flex-col items-center text-center gap-1.5 transition ${
                              isCurrent
                                ? "border-[#FF8A00] bg-orange-50/60 shadow-xs"
                                : isDone
                                ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                                : "border-slate-200 bg-white text-slate-400 opacity-60"
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                isCurrent
                                  ? "bg-[#FF8A00] text-white"
                                  : isDone
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <span
                              className={`text-[11px] font-bold leading-tight ${
                                isCurrent ? "text-[#101827]" : isDone ? "text-emerald-800" : "text-slate-600"
                              }`}
                            >
                              {s.label}
                            </span>
                            <span className="text-[9px] text-slate-500 leading-tight hidden sm:block">
                              {s.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Itemized Order Items Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Itemized Order Receipt
                </h3>
                <div className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-[#101827]">
                          {item.name}
                          {item.sourcePigTag && (
                            <span className="ml-2 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#FF8A00]">
                              Ear Tag: {item.sourcePigTag}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.category} &bull; Qty: {item.quantity} &times; {formatRwf(item.price)}
                          {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                            <span className="ml-1 text-slate-400 line-through">
                              {formatRwf(item.originalPrice)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">
                          {formatRwf(Number(item.price) * item.quantity)}
                        </p>
                        {item.discountAmount && Number(item.discountAmount) > 0 && (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Saved {formatRwf(Number(item.discountAmount) * item.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                  {order.subtotalAmount && Number(order.subtotalAmount) !== Number(order.totalAmount) && (
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatRwf(order.subtotalAmount)}</span>
                    </div>
                  )}
                  {order.discountTotal && Number(order.discountTotal) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Promotional Discount Savings</span>
                      <span>-{formatRwf(order.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#101827] pt-1 border-t border-slate-100">
                    <span>Total Amount</span>
                    <span className="text-[#FF8A00] text-base">{formatRwf(order.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery & Payment Details Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5 text-xs">
                  <p className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 text-[10px]">
                    <MapPin className="h-3.5 w-3.5 text-[#FF8A00]" />
                    <span>Delivery Address</span>
                  </p>
                  <p className="text-slate-800 font-medium">
                    {order.shippingAddress || "Local pickup / Cell distribution depot"}
                  </p>
                  {order.notes && (
                    <p className="text-slate-500 text-[11px] italic pt-1 border-t border-slate-200/60">
                      Note: {order.notes}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5 text-xs">
                  <p className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 text-[10px]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#FF8A00]" />
                    <span>Payment Information</span>
                  </p>
                  <p className="text-slate-800 font-medium">
                    Method: <span className="font-semibold">{order.paymentMethod || "Mobile Money"}</span>
                  </p>
                  {order.paymentReference ? (
                    <p className="text-slate-600 font-mono text-[11px]">
                      Ref: {order.paymentReference}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-[11px]">
                      Payment confirmation pending with Project Manager
                    </p>
                  )}
                </div>
              </div>

              {/* Direct Support Note */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 flex items-start gap-3 text-xs text-slate-800">
                <HelpCircle className="h-4 w-4 text-[#FF8A00] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#101827]">Need Delivery Assistance or Fast-Track Verification?</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Contact the Gebyian Project Manager directly with your order reference{" "}
                    <span className="font-mono font-bold text-[#101827]">{order.orderNumber}</span> to confirm MoMo
                    transaction codes, schedule driver pickup, or inspect animal veterinary tags before departure.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
