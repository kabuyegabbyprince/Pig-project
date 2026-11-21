import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthProvider } from "@/components/AuthProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <AuthProvider session={session}>
      <DashboardShell initialSession={session}>{children}</DashboardShell>
    </AuthProvider>
  );
}
