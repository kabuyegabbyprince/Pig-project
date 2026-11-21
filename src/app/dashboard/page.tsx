import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { normalizeRoleValue } from "@/lib/roles";

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { role?: string };
  const role = normalizeRoleValue(user.role);

  switch (role) {
    case "SUPER_ADMIN":
    case "PROJECT_MANAGER":
      redirect("/dashboard/admin");
    case "CELL_MANAGER":
    case "COOPERATIVE_LEADER":
    case "COOPERATIVE_MEMBER":
    case "TRAINER":
      redirect("/dashboard/field");
    case "VETERINARIAN":
      redirect("/dashboard/vet");
    case "ACCOUNTANT":
    case "FINANCE_OFFICER":
      redirect("/dashboard/finance");
    case "FUNDER":
      redirect("/dashboard/admin/reports");
    default:
      redirect("/login");
  }
}
