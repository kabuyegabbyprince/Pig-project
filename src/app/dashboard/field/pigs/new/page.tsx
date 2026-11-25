import { getRegisteredPigs, getTotalPigsAvailable } from "@/app/actions/pig";
import { PigRegisterManager } from "@/components/pigs/PigRegisterManager";

export const dynamic = "force-dynamic";

export default async function FieldNewPigPage() {
  const [initialPigs, initialTotalAvailable] = await Promise.all([
    getRegisteredPigs(),
    getTotalPigsAvailable(),
  ]);

  return (
    <PigRegisterManager
      initialPigs={initialPigs}
      initialTotalAvailable={initialTotalAvailable}
      backHref="/dashboard/field/pigs"
    />
  );
}
