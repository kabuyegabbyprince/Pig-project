import { getAllPigsForVet } from "@/app/actions/veterinary";
import { VeterinaryExaminationForm } from "@/components/veterinary/VeterinaryExaminationForm";

export const dynamic = "force-dynamic";

export default async function NewVetVisitPage() {
  const pigs = await getAllPigsForVet();
  return <VeterinaryExaminationForm pigs={pigs} backHref="/dashboard/vet/veterinary" />;
}
