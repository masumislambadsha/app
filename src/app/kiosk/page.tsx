import { cookies } from "next/headers";
import { newKioskCookie } from "@/app/api/kiosk/token/route";
import KioskDisplay from "./KioskDisplay";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kiosk" };

export default async function KioskPage() {
  const store = await cookies();
  store.set("kiosk_auth", (await newKioskCookie()).value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6">
      <KioskDisplay />
    </main>
  );
}