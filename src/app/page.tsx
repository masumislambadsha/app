import { redirect } from "next/navigation";
import { currentSession } from "@/auth";

export default async function HomePage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");
  redirect("/me");
}