"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const sendOtp = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, type: "sign-in" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.message as string) || "Failed to send code.");
      }
      setStep("otp");
      setFlash("Code sent. Check your email for the 6-digit code.");

      const dev = await fetch(`/api/dev/otp?email=${encodeURIComponent(e)}`).catch(() => null);
      if (dev?.ok) {
        const data = (await dev.json()) as { otp: string };
        setDevOtp(data.otp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email-otp/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body?.message as string) || "That code did not verify.");
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step === "email") void sendOtp();
    else void verifyOtp();
  };

  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 6000);
      return () => clearTimeout(t);
    }
  }, [flash]);

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-white">Office Attendance</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your office email</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          {step === "email" ? (
            <label className="block">
              <span className="text-sm text-slate-300">Work email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@office.com"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm text-slate-300">6-digit code sent to {email}</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xl tracking-[0.5em] text-slate-100 outline-none focus:border-sky-500"
              />
            </label>
          )}

          {devOtp && (
            <p className="mt-3 rounded-md bg-emerald-900/40 px-3 py-2 text-sm text-emerald-300">
              Dev mode — your code is <span className="font-mono font-bold tracking-widest">{devOtp}</span>
            </p>
          )}
          {flash && <p className="mt-3 text-sm text-sky-300">{flash}</p>}
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

          <div className="mt-5 flex gap-3">
            {step === "otp" && (
              <button
                type="button"
                onClick={() => setStep("email")}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy ? "Please wait…" : step === "email" ? "Send code" : "Verify & sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}