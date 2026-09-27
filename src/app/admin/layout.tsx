import { redirect } from "next/navigation";
import { currentSession } from "@/auth";
import { AdminShell } from "@/components/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/me");
  return <AdminShell>{children}</AdminShell>;
}