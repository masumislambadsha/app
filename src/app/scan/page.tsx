"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const DEVICE_KEY = "att.deviceId";
const TOKEN_KEY = "att.deviceToken";
const READER_ID = "att-qr-reader";

type DeviceState = "loading" | "pending" | "approved" | "revoked" | "error";

interface ScanResult {
  kind: "in" | "out";
  status: string;
  message: string;
  checkedAt: string;
  date: string;
}

export default function ScanPage() {
  const [deviceState, setDeviceState] = useState<DeviceState>("loading");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scanner = useRef<Html5Qrcode | null>(null);
  const tokenRef = useRef<string | null>(null);
  const stopRef = useRef(false);

  const ensureDevice = useCallback(async () => {
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = `${crypto.randomUUID()}`;
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
    try {
      const res = await fetch("/api/device/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const body = (await res.json()) as { device_token?: string; status?: string; error?: string };
      if (!res.ok || !body.device_token) {
        setDeviceError(body.error ?? "device registration failed");
        setDeviceState("error");
        return;
      }
      localStorage.setItem(TOKEN_KEY, body.device_token);
      tokenRef.current = body.device_token;
      setDeviceState(body.status as DeviceState);
    } catch {
      setDeviceError("could not reach the server");
      setDeviceState("error");
    }
  }, []);

  useEffect(() => {
    void ensureDevice();
  }, [ensureDevice]);

  const handleToken = useCallback(
    async (token: string) => {
      if (busy || stopRef.current) return;
      setBusy(true);
      setScanError(null);
      try {
        const res = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, device_token: tokenRef.current }),
        });
        const body = (await res.json()) as ScanResult & { error?: string; code?: string };
        if (!res.ok || !body.message) {
          throw new Error(body.error ?? "check-in failed");
        }
        setResult(body);
      } catch (e) {
        setScanError(e instanceof Error ? e.message : "check-in failed");
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const startScanner = useCallback(async () => {
    stopRef.current = false;
    setResult(null);
    setScanError(null);
    if (!scanner.current) {
      scanner.current = new Html5Qrcode(READER_ID);
    }
    try {
      await scanner.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => void handleToken(decodedText),
        () => undefined,
      );
    } catch {
      setScanError("Camera unavailable. Make sure you allowed camera access (needs HTTPS).");
    }
  }, [handleToken]);

  const stopScanner = useCallback(async () => {
    stopRef.current = true;
    if (scanner.current && scanner.current.isScanning) {
      await scanner.current.stop().catch(() => undefined);
    }
  }, []);

  useEffect(() => () => void stopScanner(), [stopScanner]);

  return (
    <main className="flex-1 flex flex-col items-center bg-slate-950 p-4">
      <header className="mb-4 flex w-full max-w-md items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Scan the kiosk QR</h1>
          <p className="text-sm text-slate-400">
            {deviceState === "approved"
              ? "Device ready — scan the rotating QR at the entrance."
              : deviceState === "pending"
                ? "Device pending admin approval."
                : deviceState === "loading"
                  ? "Registering device…"
                  : "Device problem."}
          </p>
        </div>
      </header>

      {deviceState === "revoked" && (
        <div className="mb-3 w-full max-w-md rounded-md bg-rose-900/40 px-3 py-2 text-sm text-rose-300">
          This device was revoked. Refresh the page to re-register; an admin must approve it again.
        </div>
      )}

      <div className="w-full max-w-md">
        <div id={READER_ID} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900" />

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            disabled={deviceState !== "approved" || busy}
            onClick={() => {
              if (result) void startScanner();
              else void startScanner();
            }}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {busy ? "Recording…" : result ? "Scan again" : "Start camera"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-4 rounded-xl border p-4 text-center ${
              result.kind === "in" ? "border-emerald-700 bg-emerald-900/30" : "border-sky-700 bg-sky-900/30"
            }`}
          >
            <p className="text-2xl font-semibold">{result.kind === "in" ? "Checked in" : "Checked out"}</p>
            <p className="mt-1 text-sm text-slate-300">{result.message}</p>
            <p className="mt-1 text-xs text-slate-400">
              {result.date} at {new Date(result.checkedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka" })} ·
              status: {result.status}
            </p>
          </div>
        )}
        {scanError && <p className="mt-3 text-center text-sm text-rose-400">{scanError}</p>}
        {deviceError && <p className="mt-3 text-center text-sm text-rose-400">{deviceError}</p>}
      </div>
    </main>
  );
}