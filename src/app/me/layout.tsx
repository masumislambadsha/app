import { redirect } from "next/navigation";
import { currentSession } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  return (
    <DashboardShell variant="employee" user={session.user}>
      {children}
    </DashboardShell>
  );
}
