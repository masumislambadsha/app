"use client";

import { useEffect, useState } from "react";

const REFRESH_MS = 30_000;

export default function KioskDisplay() {
  const [qr, setQr] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(REFRESH_MS / 1000);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const res = await fetch("/api/kiosk/token", { cache: "no-store" });
        if (!res.ok) throw new Error("could not reach token service");
        const data = (await res.json()) as { qr: string; expiresAt: string };
        if (!alive) return;
        setQr(data.qr);
        const expiry = new Date(data.expiresAt).getTime();
        setExpiresIn(Math.max(1, Math.round((expiry - Date.now()) / 1000)));
        setError(null);
      } catch {
        if (alive) setError("Kiosk offline — showing last QR");
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), REFRESH_MS);
    const countdown = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Scan to check in / out</h2>
        <p className="mt-1 text-xs text-slate-500">
          Code refreshes every {REFRESH_MS / 1000}s — sharing a photo will not work.
        </p>
      </div>

      <div className="relative rounded-2xl border border-slate-800 bg-white p-6 shadow-2xl">
        {qr ? (
          <img src={qr} alt="Scan this QR with the attendance app" className="h-72 w-72" draggable={false} />
        ) : (
          <div className="flex h-72 w-72 items-center justify-center text-slate-400">
            {error ?? "Loading…"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-1/2">
          <span
            className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-sky-300"
            aria-live="polite"
          >
            {expiresIn}s
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-amber-400">{error}</p>}
      <p className="text-xs text-slate-600">Attendance kiosk · {new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</p>
    </div>
  );
}