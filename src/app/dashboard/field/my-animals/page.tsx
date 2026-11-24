import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCooperativesWorkspaceData } from "@/app/actions/cooperative";
import { MemberAnimalsClient } from "@/components/field/MemberAnimalsClient";

export const dynamic = "force-dynamic";

export default async function MemberAnimalsPage() {
  const actor = await getActiveUser([
    Role.SUPER_ADMIN,
    Role.CELL_MANAGER,
    Role.COOPERATIVE_LEADER,
    Role.COOPERATIVE_MEMBER,
  ]);
  if (!actor) {
    redirect("/login");
  }

  const data = await getCooperativesWorkspaceData();
  if (!data) {
    redirect("/login");
  }

  return <MemberAnimalsClient data={data} />;
}
