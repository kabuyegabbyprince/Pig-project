"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
  Wheat,
} from "lucide-react";
import { formatRwf } from "@/lib/format-rwf";

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isNegotiable?: boolean;
  effectivePrice: string;
  hasActiveDiscount: boolean;
  discountPercent: number;
  discountLabel: string | null;
  stock: number;
  lowStockThreshold: number;
  category: string;
  storeSection: "ANIMALS" | "ANIMAL_FOOD";
  imageUrl: string | null;
  sourcePigTag: string | null;
};

type CartItem = {
  product: StorefrontProduct;
  quantity: number;
};

type SectionTab = "ALL" | "ANIMALS" | "ANIMAL_FOOD" | "DISCOUNTS";

export function StorefrontClient({
  initialProducts,
  tableMissing,
}: {
  initialProducts: StorefrontProduct[];
  tableMissing: boolean;
}) {
  const [products, setProducts] = useState<StorefrontProduct[]>(initialProducts);
  const [activeSection, setActiveSection] = useState<SectionTab>("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MTN MoMo");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    totalAmount: string;
    discountTotal?: string;
    paymentMethod: string;
  } | null>(null);

  const sectionCounts = useMemo(() => {
    return {
      ALL: products.length,
      ANIMALS: products.filter((p) => p.storeSection === "ANIMALS").length,
      ANIMAL_FOOD: products.filter((p) => p.storeSection === "ANIMAL_FOOD").length,
      DISCOUNTS: products.filter((p) => p.hasActiveDiscount).length,
    };
  }, [products]);

  const sectionFiltered = useMemo(() => {
    return products.filter((p) => {
      if (activeSection === "ANIMALS" && p.storeSection !== "ANIMALS") return false;
      if (activeSection === "ANIMAL_FOOD" && p.storeSection !== "ANIMAL_FOOD") return false;
      if (activeSection === "DISCOUNTS" && !p.hasActiveDiscount) return false;
      return true;
    });
  }, [products, activeSection]);

  const categories = useMemo(() => {
    const set = new Set<string>(["ALL"]);
    for (const p of sectionFiltered) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [sectionFiltered]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sectionFiltered.filter((p) => {
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !(p.description || "").toLowerCase().includes(q) &&
        !(p.sourcePigTag || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sectionFiltered, selectedCategory, searchQuery]);

  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let total = 0;
    for (const item of cart) {
      subtotal += Number(item.product.price) * item.quantity;
      total += Number(item.product.effectivePrice) * item.quantity;
    }
    const discountSavings = Math.max(0, subtotal - total);
    return { subtotal, total, discountSavings };
  }, [cart]);

  const addToCart = (product: StorefrontProduct) => {
    setError("");
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = item.quantity + delta;
          if (next <= 0) return null;
          return { ...item, quantity: Math.min(next, item.product.stock) };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          shippingAddress,
          paymentMethod,
          notes,
          items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place order.");
      } else {
        setConfirmedOrder(data.order);
        const orderedMap = new Map(cart.map((c) => [c.product.id, c.quantity]));
        setProducts((prev) =>
          prev.map((p) => {
            const qty = orderedMap.get(p.id) ?? 0;
            return { ...p, stock: Math.max(0, p.stock - qty) };
          })
        );
        setCart([]);
        setNotes("");
      }
    } catch {
      setError("Network error submitting order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSectionChange = (tab: SectionTab) => {
    setActiveSection(tab);
    setSelectedCategory("ALL");
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#F5F5F5] text-[#101827]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Pig Project Rwanda home" className="flex items-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-9 w-auto object-contain" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#101827] hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Back to Home</span>
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
                Pig Project Rwanda &bull; Gebyian Website
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-[#101827]">
                Gebyian Network Marketplace
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/store/track"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] hover:bg-slate-50"
            >
              <Search className="h-3.5 w-3.5 text-[#FF8A00]" />
              <span>Track My Order</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937]"
            >
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tableMissing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            The E-Commerce database tables have not been provisioned in Supabase yet. Execute{" "}
            <span className="font-mono font-semibold">update.sql</span> in Supabase SQL Editor or check{" "}
            <span className="font-semibold">/dashboard/admin/ecommerce</span>.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3 items-start">
            {/* Catalog Grid */}
            <div className="lg:col-span-2 space-y-5">
              {/* Two-Part Division Tabs + Search */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSectionChange("ALL")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                        activeSection === "ALL"
                          ? "bg-[#101827] text-white"
                          : "border border-slate-200 bg-slate-50 text-[#101827] hover:border-[#FF8A00]"
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5 text-[#FF8A00]" />
                      <span>All ({sectionCounts.ALL})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSectionChange("ANIMALS")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                        activeSection === "ANIMALS"
                          ? "bg-[#101827] text-white"
                          : "border border-slate-200 bg-slate-50 text-[#101827] hover:border-[#FF8A00]"
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5 text-[#FF8A00]" />
                      <span>Animals &amp; Livestock ({sectionCounts.ANIMALS})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSectionChange("ANIMAL_FOOD")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                        activeSection === "ANIMAL_FOOD"
                          ? "bg-[#101827] text-white"
                          : "border border-slate-200 bg-slate-50 text-[#101827] hover:border-[#FF8A00]"
                      }`}
                    >
                      <Wheat className="h-3.5 w-3.5 text-[#FF8A00]" />
                      <span>Animal Food &amp; Feed ({sectionCounts.ANIMAL_FOOD})</span>
                    </button>
                    {sectionCounts.DISCOUNTS > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSectionChange("DISCOUNTS")}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                          activeSection === "DISCOUNTS"
                            ? "bg-[#FF8A00] text-[#101827]"
                            : "border border-orange-200 bg-orange-50 text-[#FF8A00] hover:bg-orange-100"
                        }`}
                      >
                        <Percent className="h-3.5 w-3.5" />
                        <span>On Sale ({sectionCounts.DISCOUNTS})</span>
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search pigs, tags, feed..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-[#101827] focus:border-[#FF8A00] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                {categories.length > 2 && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-[#FF8A00] text-[#101827]"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-[#FF8A00] hover:text-[#FF8A00]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  <Package className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  No products are currently available matching your filter.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredProducts.map((product) => {
                    const inCartQty = cart.find((c) => c.product.id === product.id)?.quantity ?? 0;
                    const isStockedOut = product.stock === 0;
                    const maxReached = isStockedOut || inCartQty >= product.stock;
                    const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

                    return (
                      <div
                        key={product.id}
                        className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition ${
                          isStockedOut
                            ? "border-rose-200/80 opacity-85"
                            : "border-slate-200 hover:border-[#FF8A00]/60"
                        }`}
                      >
                        <div>
                          {product.imageUrl && (
                            <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-40 w-full object-cover"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  product.storeSection === "ANIMAL_FOOD"
                                    ? "bg-slate-100 text-[#101827]"
                                    : "bg-orange-50 text-[#FF8A00]"
                                }`}
                              >
                                {product.storeSection === "ANIMAL_FOOD" ? "Animal Food" : "Animals"}
                              </span>
                              <span className="inline-flex rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {product.category}
                              </span>
                            </div>

                            {isStockedOut ? (
                              <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-700">
                                STOCKED OUT
                              </span>
                            ) : (
                              <span
                                className={`text-[11px] font-bold ${
                                  isLowStock ? "text-[#FF8A00]" : "text-slate-500"
                                }`}
                              >
                                {isLowStock ? `Only ${product.stock} left!` : `${product.stock} in stock`}
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5 flex items-start justify-between gap-2">
                            <h2 className="text-base font-bold text-[#101827]">{product.name}</h2>
                            {product.hasActiveDiscount && (
                              <span className="shrink-0 rounded-md bg-[#FF8A00] px-2 py-0.5 text-[11px] font-extrabold text-[#101827]">
                                -{product.discountPercent}%{product.discountLabel ? ` · ${product.discountLabel}` : ""}
                              </span>
                            )}
                          </div>

                          {product.sourcePigTag && (
                            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF8A00]">
                              <Tag className="h-3 w-3" />
                              Vet-Cleared Tag: {product.sourcePigTag}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                            {product.description || "Verified cooperative farm product."}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                          <div>
                            {product.hasActiveDiscount ? (
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-400 line-through">
                                  {formatRwf(product.price)}
                                </span>
                                <span className="text-base font-extrabold text-[#FF8A00]">
                                  {formatRwf(product.effectivePrice)}
                                </span>
                              </div>
                            ) : (
                              <p className="text-base font-bold text-[#101827]">
                                {formatRwf(product.price)}
                              </p>
                            )}
                            {product.isNegotiable && (
                              <span className="mt-0.5 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                Bargainable
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={maxReached}
                            onClick={() => addToCart(product)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] disabled:opacity-45 cursor-pointer transition"
                          >
                            {!isStockedOut && <Plus className="h-3.5 w-3.5 text-[#FF8A00]" />}
                            <span>
                              {isStockedOut ? "Stocked Out" : maxReached ? "Max Stock" : "Add to Cart"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart & Checkout Panel */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 lg:sticky lg:top-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4.5 w-4.5 text-[#FF8A00]" />
                  <h2 className="text-base font-bold text-[#101827]">Your Order Cart</h2>
                </div>
                <span className="rounded-lg bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#FF8A00]">
                  {cart.reduce((s, c) => s + c.quantity, 0)} items
                </span>
              </div>

              {confirmedOrder && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#101827] font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#FF8A00]" />
                    <span>Order Placed: {confirmedOrder.orderNumber}</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Total: {formatRwf(confirmedOrder.totalAmount)} ({confirmedOrder.paymentMethod}).
                    Project Manager (Gebyian) has been notified to confirm dispatch.
                  </p>
                  <Link
                    href={`/store/track?orderNumber=${encodeURIComponent(confirmedOrder.orderNumber)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#FF8A00] underline"
                  >
                    Track Order Status →
                  </Link>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                  {error}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <ShoppingBag className="mx-auto h-7 w-7 text-slate-400 mb-1.5" />
                  Select animals or feed products from the catalog to start your order.
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#101827] truncate">{item.product.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="font-semibold text-[#FF8A00]">
                              {formatRwf(item.product.effectivePrice)}
                            </span>
                            {item.product.hasActiveDiscount && (
                              <span className="text-slate-400 line-through">
                                {formatRwf(item.product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="rounded border border-slate-200 p-1 hover:bg-white cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="rounded border border-slate-200 p-1 hover:bg-white cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                    {cartSummary.discountSavings > 0 && (
                      <>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Subtotal</span>
                          <span>{formatRwf(cartSummary.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between font-semibold text-[#FF8A00]">
                          <span>Discount Savings</span>
                          <span>-{formatRwf(cartSummary.discountSavings)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold uppercase text-slate-600">Order Total</span>
                      <span className="text-lg font-extrabold text-[#101827]">
                        {formatRwf(cartSummary.total)}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-3 border-t border-slate-200 pt-4">
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#FF8A00] focus:outline-none"
                    />
                    <input
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Telephone (e.g. 0788...) *"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#FF8A00] focus:outline-none"
                    />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#FF8A00] focus:outline-none"
                    />
                    <input
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Delivery District / Sector / Cell"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#FF8A00] focus:outline-none"
                    />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#FF8A00] focus:outline-none"
                    >
                      <option value="MTN MoMo">MTN Mobile Money</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash on Delivery">Cash on Farm Pickup / Delivery</option>
                    </select>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Order notes (optional)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#FF8A00] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#101827] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1f2937] disabled:opacity-50 cursor-pointer transition"
                    >
                      {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF8A00]" />}
                      <span>{submitting ? "Submitting Order..." : "Place Order"}</span>
                    </button>
                  </form>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
