import { getCachedSession } from "@/lib/session";
import { AuthProvider } from "@/components/AuthProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  return (
    <AuthProvider session={session}>
      <DashboardShell initialSession={session}>{children}</DashboardShell>
    </AuthProvider>
  );
}
