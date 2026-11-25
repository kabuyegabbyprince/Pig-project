import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCooperativesWorkspaceData } from "@/app/actions/cooperative";
import { EnrollCooperativeBeneficiaryForm } from "@/components/field/EnrollCooperativeBeneficiaryForm";

export const dynamic = "force-dynamic";

export default async function NewBeneficiaryPage() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    redirect("/dashboard/field/beneficiaries");
  }

  const data = await getCooperativesWorkspaceData();
  const cooperatives = (data?.cooperatives ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    cellName: c.cellName,
    memberCount: c.memberCount,
    maxMembers: c.maxMembers,
  }));

  return (
    <EnrollCooperativeBeneficiaryForm
      cooperatives={cooperatives}
      backHref="/dashboard/field/beneficiaries"
      manageCoopsHref="/dashboard/field/cooperative"
    />
  );
}
