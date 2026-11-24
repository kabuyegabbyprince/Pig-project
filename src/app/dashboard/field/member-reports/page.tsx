import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCooperativesWorkspaceData } from "@/app/actions/cooperative";
import { MemberReportsClient } from "@/components/field/MemberReportsClient";

export const dynamic = "force-dynamic";

export default async function MemberReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ pigId?: string }> | { pigId?: string };
}) {
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

  const params = await Promise.resolve(searchParams ?? {});
  const initialPigId = typeof params.pigId === "string" ? params.pigId : "";

  return <MemberReportsClient data={data} initialPigId={initialPigId} />;
}
