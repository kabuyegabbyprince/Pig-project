import { getCachedSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { normalizeRoleValue } from "@/lib/roles";

export default async function DashboardRedirect() {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { role?: string };
  const role = normalizeRoleValue(user.role);

  switch (role) {
    case "SUPER_ADMIN":
      redirect("/dashboard/admin");
    case "PROJECT_MANAGER":
      redirect("/dashboard/gebyian");
    case "CELL_MANAGER":
    case "COOPERATIVE_LEADER":
    case "COOPERATIVE_MEMBER":
      redirect("/dashboard/field");
    case "VETERINARIAN":
      redirect("/dashboard/vet");
    case "FINANCE_OFFICER":
      redirect("/dashboard/finance");
    default:
      redirect("/login");
  }
}
