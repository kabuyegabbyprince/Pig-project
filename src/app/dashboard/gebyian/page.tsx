export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatus, Role } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardList,
  ExternalLink,
  Package,
  Percent,
  PiggyBank,
  ShoppingBag,
  Tag,
  Wallet,
  Wheat,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/lib/active-user";
import { getEcommerceOverview } from "@/app/actions/ecommerce";
import { formatRwf } from "@/lib/format-rwf";

export default async function GebyianManagerDashboard() {
  const actor = await getActiveUser([Role.PROJECT_MANAGER, Role.SUPER_ADMIN]);
  if (!actor) {
    redirect("/dashboard");
  }

  const [overview, unreadAlertsCount, recentAlerts] = await Promise.all([
    getEcommerceOverview(),
    prisma.notification.count({ where: { userId: actor.id, isRead: false } }),
    prisma.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const animalProducts = overview.products.filter((p) => p.storeSection === "ANIMALS");
  const feedProducts = overview.products.filter((p) => p.storeSection === "ANIMAL_FOOD");
  const activeDiscounts = overview.products.filter((p) => p.hasActiveDiscount);
  const lowStockProducts = overview.products.filter(
    (p) => p.stock <= (p.lowStockThreshold ?? 3)
  );
  const pendingReports = overview.stockReports.filter((r) => r.status === "PENDING");
  const activeOrders = overview.orders.filter(
    (o) =>
      o.status === OrderStatus.PENDING ||
      o.status === OrderStatus.PAID ||
      o.status === OrderStatus.PROCESSING
  );

  const feedSalesTotal = overview.feedSales
    .filter((s) => s.verificationStatus !== "REJECTED")
    .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

  const kpis = [
    {
      title: "Animals Published",
      value: animalProducts.filter((p) => p.isAvailable && p.stock > 0).length,
      sub: `${animalProducts.length} total animal SKUs`,
      icon: PiggyBank,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
    {
      title: "Animal Food SKUs",
      value: feedProducts.filter((p) => p.isAvailable && p.stock > 0).length,
      sub: `${feedProducts.length} total feed SKUs`,
      icon: Wheat,
      tone: "bg-slate-100 text-[#101827]",
    },
    {
      title: "Active Discounts",
      value: activeDiscounts.length,
      sub: "Live promos on Gebyian",
      icon: Percent,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
    {
      title: "Low / Out of Stock",
      value: lowStockProducts.length,
      sub: "Products needing restock",
      icon: AlertTriangle,
      tone: lowStockProducts.length > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-[#101827]",
    },
    {
      title: "Pending Coop Stock Reports",
      value: pendingReports.length,
      sub: "From Cell Managers",
      icon: ClipboardList,
      tone: pendingReports.length > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-[#101827]",
    },
    {
      title: "Pending Buyer Orders",
      value: overview.pendingOrdersCount,
      sub: `${overview.orders.length} total orders`,
      icon: ShoppingBag,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
    {
      title: "Gebyian Revenue",
      value: overview.tableMissing ? "Setup Required" : formatRwf(overview.totalRevenue),
      sub: "Paid / dispatched / completed",
      icon: Wallet,
      tone: "bg-slate-100 text-[#101827]",
    },
    {
      title: "Cell Feed Sales Volume",
      value: overview.tableMissing ? "Setup Required" : formatRwf(feedSalesTotal),
      sub: `${overview.feedSales.length} field sales logged`,
      icon: Package,
      tone: "bg-orange-50 text-[#FF8A00]",
    },
  ];

  const gebyianModules = [
    {
      title: "Cooperative Stock Intake",
      description: "Review pigs reported by Cell Managers and set official stock, price & discounts.",
      href: "/dashboard/admin/ecommerce#coop-reports",
      icon: ClipboardList,
      badge: pendingReports.length > 0 ? `${pendingReports.length} pending` : undefined,
    },
    {
      title: "Animals & Food Catalog",
      description: "Create, stock, price, and apply time-limited discounts on Animals & Animal Food.",
      href: "/dashboard/admin/ecommerce#catalog",
      icon: Tag,
    },
    {
      title: "Customer Orders & Dispatch",
      description: "Confirm MoMo/Bank payments, print receipts, and update delivery status.",
      href: "/dashboard/admin/ecommerce#orders",
      icon: ShoppingBag,
      badge: overview.pendingOrdersCount > 0 ? `${overview.pendingOrdersCount} active` : undefined,
    },
    {
      title: "Cell Feed Sales Monitor",
      description: "Monitor Animal Food sold by Cell Managers and Finance Officer verification.",
      href: "/dashboard/admin/ecommerce#feed-sales",
      icon: Wheat,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            Gebyian Network &bull; Marketplace Control
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#101827]">
            Project Manager (Gebyian) Command
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{actor.name}</span> &bull; Manage Animals &amp;
            Animal Food inventory, pricing, discounts, cooperative stock intake, and buyer orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/admin/ecommerce"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1f2937] transition"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Open Gebyian Network Control</span>
          </Link>
          <Link
            href="/store"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101827] shadow-xs hover:border-[#FF8A00] hover:bg-orange-50/40 transition"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#FF8A00]" />
            <span>Live Storefront</span>
          </Link>
        </div>
      </div>

      {overview.tableMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#FF8A00] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gebyian Network Tables Not Provisioned Yet</p>
              <p className="text-xs text-amber-900/90 mt-0.5">
                Open Gebyian Network Control to copy the SQL migration script and run it in Supabase SQL Editor.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/ecommerce"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white shrink-0"
          >
            <span>Open Setup SQL</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#FF8A00]" />
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ title, value, sub, icon: Icon, tone }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{title}</p>
                <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-[#101827]">{value}</p>
                <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gebyian Modules */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#101827]">Gebyian Network Management</h2>
          <p className="text-xs text-slate-500">
            Part 1 (Animals Marketplace) &amp; Part 2 (Animal Food &amp; Feed Supplies)
          </p>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {gebyianModules.map(({ title, description, href, icon: Icon, badge }) => (
            <Link
              key={title}
              href={href}
              prefetch={false}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-[#FF8A00] hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {badge && (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#FF8A00]">
                        {badge}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#FF8A00] transition-all" />
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#101827]">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Queues: Pending Cooperative Stock Reports & Active Buyer Orders */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Cooperative Stock Reports */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#FF8A00]" />
              <h2 className="text-sm font-bold text-[#101827]">
                Cooperative Stock Reports Awaiting Pricing ({pendingReports.length})
              </h2>
            </div>
            <Link
              href="/dashboard/admin/ecommerce#coop-reports"
              className="text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              Manage All
            </Link>
          </div>

          {pendingReports.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No pending cooperative animal stock reports from Cell Managers.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingReports.slice(0, 5).map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-[#101827] truncate">{r.animalTitle}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.cooperativeOwnerName} &bull; {r.cellName} &bull; Qty: {r.pigCount}
                      {r.suggestedPrice ? ` &bull; Suggested: ${formatRwf(r.suggestedPrice)}` : ""}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/admin/ecommerce#coop-reports"
                    className="shrink-0 rounded-lg bg-[#101827] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1f2937]"
                  >
                    Set Price &amp; List
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Buyer Orders */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#FF8A00]" />
              <h2 className="text-sm font-bold text-[#101827]">
                Active Buyer Orders ({activeOrders.length})
              </h2>
            </div>
            <Link
              href="/dashboard/admin/ecommerce#orders"
              className="text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              All Orders
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No pending buyer orders awaiting confirmation right now.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#FF8A00]">{o.orderNumber}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#101827]">
                        {o.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {o.customerName}
                      {o.customerPhone ? ` (${o.customerPhone})` : ""} &bull; {o.itemCount} item(s)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#101827]">{formatRwf(o.totalAmount)}</p>
                    <Link
                      href={`/dashboard/admin/ecommerce/${o.id}`}
                      className="text-[11px] font-semibold text-[#FF8A00] hover:underline"
                    >
                      Open Receipt
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Low Stock Inventory & Recent Gebyian Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#FF8A00]" />
              <h2 className="text-sm font-bold text-[#101827]">
                Low-Stock Inventory Warnings ({lowStockProducts.length})
              </h2>
            </div>
            <Link
              href="/dashboard/admin/ecommerce#catalog"
              className="text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              Adjust Stock
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              All published Animals and Animal Food SKUs are well stocked.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStockProducts.slice(0, 6).map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#101827] truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {p.storeSection === "ANIMAL_FOOD" ? "Animal Food" : "Animals Marketplace"} &bull;{" "}
                      {formatRwf(p.effectivePrice)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      p.stock <= 0 ? "bg-rose-50 text-rose-700" : "bg-orange-50 text-[#FF8A00]"
                    }`}
                  >
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#FF8A00]" />
              <h2 className="text-sm font-bold text-[#101827]">
                Order &amp; Stock Notifications ({unreadAlertsCount} unread)
              </h2>
            </div>
            <Link
              href="/dashboard/admin/notifications"
              className="text-xs font-semibold text-[#FF8A00] hover:underline"
            >
              View All
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No Gebyian Network notifications yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAlerts.map((n) => (
                <div key={n.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-[#101827] truncate">{n.title}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
