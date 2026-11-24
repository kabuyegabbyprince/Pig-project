import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCooperativesWorkspaceData } from "@/app/actions/cooperative";
import { CooperativeManagerClient } from "@/components/field/CooperativeManagerClient";

export const dynamic = "force-dynamic";

export default async function CooperativeManagementPage() {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
  ]);
  if (!actor) {
    redirect("/dashboard/field");
  }

  const data = await getCooperativesWorkspaceData();
  if (!data) {
    redirect("/login");
  }

  return <CooperativeManagerClient data={data} />;
}
