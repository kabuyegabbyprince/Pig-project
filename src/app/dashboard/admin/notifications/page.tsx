import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { NotificationType, Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { ALL_ROLE_VALUES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const activeUser = await getActiveUser([...ALL_ROLE_VALUES]);
  if (!activeUser) {
    redirect("/dashboard");
  }

  const isGebyianManager = activeUser.role === Role.PROJECT_MANAGER;

  const notifications = await prisma.notification.findMany({
    where: { userId: activeUser.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A00]">
            {isGebyianManager ? "Gebyian Network Alerts" : "System Alerts"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#101827]">
            {isGebyianManager ? "Order & Stock Notifications" : "Notifications & Alerts"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isGebyianManager
              ? "Buyer order submissions from Gebyian Network and cooperative animal stock reports from Cell Managers."
              : "System alerts and operational activity updates."}
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#101827] hover:border-[#FF8A00] self-start"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#FF8A00]" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-slate-200 overflow-hidden">
        {notifications.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const isCritical =
                notification.type === NotificationType.ALERT ||
                notification.type === NotificationType.HEALTH_ALERT ||
                notification.type === NotificationType.MORTALITY_ALERT;

              return (
                <li
                  key={notification.id}
                  className={`p-4 transition ${!notification.isRead ? "bg-orange-50/40" : "bg-white"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-0.5">
                      <Bell className={`h-5 w-5 ${isCritical ? "text-rose-500" : "text-[#FF8A00]"}`} />
                    </div>
                    <div className="w-full min-w-0">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <p
                          className={`text-sm ${
                            !notification.isRead ? "text-[#101827] font-bold" : "text-slate-700 font-medium"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            <CheckCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            You have no notifications. All clear!
          </div>
        )}
      </div>
    </div>
  );
}
