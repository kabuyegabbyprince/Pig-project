import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getActiveUser } from "@/lib/active-user";
import { getCooperativesWorkspaceData } from "@/app/actions/cooperative";
import { MOMO_SETTING_KEY } from "@/lib/finance-types";
import { prisma } from "@/lib/prisma";
import { CooperativeDistributionClient } from "@/components/field/CooperativeDistributionClient";

export const dynamic = "force-dynamic";

export default async function NewDistributionPage() {
  const actor = await getActiveUser([Role.SUPER_ADMIN, Role.CELL_MANAGER]);
  if (!actor) {
    redirect("/dashboard/field/distributions");
  }

  const [coopData, setting] = await Promise.all([
    getCooperativesWorkspaceData(),
    prisma.systemSetting.findUnique({ where: { key: MOMO_SETTING_KEY } }),
  ]);

  if (!coopData) {
    redirect("/login");
  }

  const momoMerchantCode = setting?.value?.trim() || "Not configured by Finance Officer yet";

  return <CooperativeDistributionClient data={coopData} momoMerchantCode={momoMerchantCode} />;
}
