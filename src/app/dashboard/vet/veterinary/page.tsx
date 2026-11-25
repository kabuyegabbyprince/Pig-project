import { getVeterinaryDateSummaries, getBadStatusPigs } from "@/app/actions/veterinary";
import { VeterinaryRecordsTableClient } from "@/components/veterinary/VeterinaryRecordsTableClient";

export const dynamic = "force-dynamic";

export default async function VeterinaryPage() {
  let summary: Awaited<ReturnType<typeof getVeterinaryDateSummaries>>["summary"] = [];
  let totalPigsAvailable = 0;
  let badStatusPigs: Awaited<ReturnType<typeof getBadStatusPigs>> = [];

  try {
    const res = await getVeterinaryDateSummaries();
    summary = res.summary;
    totalPigsAvailable = res.totalPigsAvailable;
    badStatusPigs = await getBadStatusPigs();
  } catch (error) {
    console.error("Failed to load VeterinaryPage data:", error);
  }

  return (
    <VeterinaryRecordsTableClient
      records={summary}
      badStatusPigs={badStatusPigs}
      totalPigsAvailable={totalPigsAvailable}
      newRecordHref="/dashboard/vet/veterinary/new"
    />
  );
}
