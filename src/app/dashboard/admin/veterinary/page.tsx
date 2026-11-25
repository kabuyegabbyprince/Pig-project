import { getVeterinaryDateSummaries, getBadStatusPigs } from "@/app/actions/veterinary";
import { VeterinaryRecordsTableClient } from "@/components/veterinary/VeterinaryRecordsTableClient";

export const dynamic = "force-dynamic";

export default async function AdminVeterinaryPage() {
  let summary: Awaited<ReturnType<typeof getVeterinaryDateSummaries>>["summary"] = [];
  let totalPigsAvailable = 0;
  let badStatusPigs: Awaited<ReturnType<typeof getBadStatusPigs>> = [];

  try {
    const res = await getVeterinaryDateSummaries();
    summary = res.summary;
    totalPigsAvailable = res.totalPigsAvailable;
    badStatusPigs = await getBadStatusPigs();
  } catch (error) {
    console.error("Failed to load AdminVeterinaryPage data:", error);
  }

  return (
    <VeterinaryRecordsTableClient
      records={summary}
      badStatusPigs={badStatusPigs}
      totalPigsAvailable={totalPigsAvailable}
      newRecordHref="/dashboard/admin/veterinary/new"
    />
  );
}
