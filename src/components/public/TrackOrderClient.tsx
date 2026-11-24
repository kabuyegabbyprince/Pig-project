"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, PackageCheck, Search } from "lucide-react";
import { formatRwf } from "@/lib/format-rwf";

export type TrackedOrderData = {
  orderNumber: string;
  status: string;
  customerName: string;
  totalAmount: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  shippingAddress: string | null;
  createdAt: string;
  items: Array<{
    name: string;
    category: string;
    sourcePigTag: string | null;
    quantity: number;
    price: string;
  }>;
};

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

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#101827] px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Pig Project Rwanda home" className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 border border-slate-200 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] hover:bg-orange-50"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
              Gebyian Network Order Tracking
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#101827]">Track Your Order</h1>
            <p className="mt-1 text-xs text-slate-600">
              Enter your Order Number (e.g. ORD-2026-1234AB) to view live payment, processing, and dispatch status from Project Manager (Gebyian).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Order # (ORD-2026-...)"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#FF8A00] focus:outline-none"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone or Email (optional)"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#FF8A00] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#101827] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1f2937] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" /> : <Search className="h-3.5 w-3.5 text-[#FF8A00]" />}
              <span>Check Status</span>
            </button>
          </form>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          {order && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-[#FF8A00]" />
                  <div>
                    <p className="text-sm font-bold text-[#101827]">{order.orderNumber}</p>
                    <p className="text-[11px] text-slate-500">Buyer: {order.customerName}</p>
                  </div>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#FF8A00]">
                  {order.status}
                </span>
              </div>

              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span>
                      {item.name} × {item.quantity}
                      {item.sourcePigTag ? ` (Tag: ${item.sourcePigTag})` : ""}
                    </span>
                    <span className="font-semibold">
                      {formatRwf(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold">
                <span>Total ({order.paymentMethod || "Mobile Money"})</span>
                <span className="text-[#FF8A00]">{formatRwf(order.totalAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
