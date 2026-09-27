import { redirect } from "next/navigation";
import { currentSession } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/me");
  return (
    <DashboardShell variant="admin" user={session.user}>
      {children}
    </DashboardShell>
  );
}
