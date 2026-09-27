import KioskDisplay from "./KioskDisplay";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kiosk" };

export default function KioskPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <KioskDisplay />
    </main>
  );
}