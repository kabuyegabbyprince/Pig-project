import { getRegisteredPigs, getTotalPigsAvailable } from "@/app/actions/pig";
import { PigRegisterManager } from "@/components/pigs/PigRegisterManager";

export const dynamic = "force-dynamic";

export default async function AdminNewPigPage() {
  const [initialPigs, initialTotalAvailable] = await Promise.all([
    getRegisteredPigs(),
    getTotalPigsAvailable(),
  ]);

  return (
    <PigRegisterManager
      initialPigs={initialPigs}
      initialTotalAvailable={initialTotalAvailable}
      backHref="/dashboard/admin/pigs"
    />
  );
}
