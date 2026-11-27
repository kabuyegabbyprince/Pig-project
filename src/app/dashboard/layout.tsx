import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuthProvider } from "@/components/AuthProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id || !session?.user?.role) {
    redirect("/login");
  }

  let activeUserValid = true;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
      select: { id: true, isActive: true, deletedAt: true },
    });
    activeUserValid = Boolean(dbUser && dbUser.isActive && !dbUser.deletedAt);
  } catch {
    activeUserValid = true;
  }

  if (!activeUserValid) {
    redirect("/login");
  }

  return (
    <AuthProvider session={session}>
      <DashboardShell initialSession={session}>{children}</DashboardShell>
    </AuthProvider>
  );
}
