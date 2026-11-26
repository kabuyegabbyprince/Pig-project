import { getAllPigsForVet } from "@/app/actions/veterinary";
import { VeterinaryExaminationForm } from "@/components/veterinary/VeterinaryExaminationForm";

export const dynamic = "force-dynamic";

export default async function NewVetVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ pigId?: string }>;
}) {
  const [{ pigId }, pigs] = await Promise.all([searchParams, getAllPigsForVet()]);
  return (
    <VeterinaryExaminationForm
      pigs={pigs}
      backHref="/dashboard/vet/veterinary"
      initialPigId={pigId ?? ""}
    />
  );
}
