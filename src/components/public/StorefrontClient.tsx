"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import { formatRwf } from "@/lib/format-rwf";

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  category: string;
  imageUrl: string | null;
  sourcePigTag: string | null;
};

type CartItem = {
  product: StorefrontProduct;
  quantity: number;
};

export function StorefrontClient({
  initialProducts,
  tableMissing,
}: {
  initialProducts: StorefrontProduct[];
  tableMissing: boolean;
}) {
  const [products, setProducts] = useState<StorefrontProduct[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
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
    paymentMethod: string;
  } | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(["ALL"]);
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "ALL") return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
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
        // Decrement local product stock
        const orderedMap = new Map(cart.map((c) => [c.product.id, c.quantity]));
        setProducts((prev) =>
          prev
            .map((p) => {
              const qty = orderedMap.get(p.id) ?? 0;
              return { ...p, stock: Math.max(0, p.stock - qty) };
            })
            .filter((p) => p.stock > 0)
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

  return (
    <div className="min-h-screen bg-[#f3f5f1] text-[#1b2d24]">
      {/* Header */}
      <header className="border-b border-[#dfe7df] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe7df] px-3 py-2 text-xs font-semibold text-[#173d2e] hover:bg-[#f3f5f1]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5d6e64]">
                Abafashamyumvire Cooperative Store
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-[#173d2e]">
                Pig Farm Marketplace
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/store/track"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe7df] bg-white px-3.5 py-2 text-xs font-semibold text-[#173d2e] hover:bg-[#f3f5f1]"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Track My Order</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#173d2e] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#102a22]"
            >
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tableMissing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            The E-Commerce database tables have not been provisioned in Supabase yet. Sign in as Super Admin and run the SQL migration shown in{" "}
            <span className="font-semibold">/dashboard/admin/ecommerce</span>.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3 items-start">
            {/* Catalog Grid */}
            <div className="lg:col-span-2 space-y-5">
              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      selectedCategory === cat
                        ? "bg-[#173d2e] text-white"
                        : "border border-[#dfe7df] bg-white text-[#1b2d24] hover:bg-[#eef3da]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-[#dfe7df] bg-white p-10 text-center text-sm text-[#5d6e64]">
                  <Package className="mx-auto h-8 w-8 text-[#7a8a82] mb-2" />
                  No products are currently published in this category.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#dfe7df] bg-white p-5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex rounded-full bg-[#eef3da] px-2.5 py-0.5 text-[11px] font-semibold text-[#536334]">
                            {product.category}
                          </span>
                          <span className="text-[11px] font-medium text-[#5d6e64]">
                            {product.stock} in stock
                          </span>
                        </div>
                        <h2 className="mt-3 text-base font-bold text-[#1b2d24]">{product.name}</h2>
                        {product.sourcePigTag && (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#173d2e]">
                            <Tag className="h-3 w-3" />
                            Vet-Cleared Tag: {product.sourcePigTag}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-[#5d6e64] line-clamp-2">
                          {product.description || "Verified cooperative farm product."}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#dfe7df] pt-3">
                        <p className="text-base font-bold text-[#173d2e]">
                          {formatRwf(product.price)}
                        </p>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#173d2e] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#102a22] transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart & Checkout Panel */}
            <aside className="rounded-2xl border border-[#dfe7df] bg-white p-5 shadow-sm space-y-5 lg:sticky lg:top-6">
              <div className="flex items-center justify-between border-b border-[#dfe7df] pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4.5 w-4.5 text-[#173d2e]" />
                  <h2 className="text-base font-bold text-[#1b2d24]">Your Order</h2>
                </div>
                <span className="rounded-full bg-[#e3efe7] px-2.5 py-0.5 text-xs font-bold text-[#173d2e]">
                  {cart.reduce((s, c) => s + c.quantity, 0)} items
                </span>
              </div>

              {confirmedOrder && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span>Order Placed: {confirmedOrder.orderNumber}</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Total: {formatRwf(confirmedOrder.totalAmount)} ({confirmedOrder.paymentMethod}).
                    Use your order number to track verification and dispatch.
                  </p>
                  <Link
                    href={`/store/track?orderNumber=${encodeURIComponent(confirmedOrder.orderNumber)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#173d2e] underline"
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
                <div className="py-6 text-center text-xs text-[#5d6e64]">
                  <ShoppingBag className="mx-auto h-7 w-7 text-[#7a8a82] mb-1.5" />
                  Select products from the catalog to start your order.
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#dfe7df] bg-[#fcfdfc] p-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1b2d24] truncate">{item.product.name}</p>
                          <p className="text-[11px] text-[#5d6e64]">{formatRwf(item.product.price)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="rounded border border-[#dfe7df] p-1 hover:bg-[#f3f5f1]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="rounded border border-[#dfe7df] p-1 hover:bg-[#f3f5f1]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-1 text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#dfe7df] pt-3">
                    <span className="text-xs font-semibold uppercase text-[#5d6e64]">Order Total</span>
                    <span className="text-lg font-bold text-[#173d2e]">{formatRwf(cartTotal)}</span>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-3 border-t border-[#dfe7df] pt-4">
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full rounded-xl border border-[#dfe7df] px-3 py-2 text-xs focus:border-[#173d2e] focus:outline-none"
                    />
                    <input
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Telephone (e.g. 0788...) *"
                      className="w-full rounded-xl border border-[#dfe7df] px-3 py-2 text-xs focus:border-[#173d2e] focus:outline-none"
                    />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full rounded-xl border border-[#dfe7df] px-3 py-2 text-xs focus:border-[#173d2e] focus:outline-none"
                    />
                    <input
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Delivery District / Sector / Address"
                      className="w-full rounded-xl border border-[#dfe7df] px-3 py-2 text-xs focus:border-[#173d2e] focus:outline-none"
                    />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe7df] bg-white px-3 py-2 text-xs focus:border-[#173d2e] focus:outline-none"
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
                      className="w-full rounded-xl border border-[#dfe7df] px-3 py-2 text-xs focus:border-[#173d2e] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d2e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#102a22] disabled:opacity-50 transition"
                    >
                      {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
