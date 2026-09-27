export const TIMEZONE = process.env.TIMEZONE ?? "Asia/Dhaka";
export const QR_EXPIRY_SECONDS = Number(process.env.QR_EXPIRY_SECONDS ?? 45);
export const QR_REFRESH_MS = Number(process.env.QR_REFRESH_MS ?? 30_000);
export const DUPLICATE_SCAN_WINDOW_MIN = Number(process.env.DUPLICATE_SCAN_WINDOW_MIN ?? 2);
export const CHECKIN_RATE_LIMIT = Number(process.env.CHECKIN_RATE_LIMIT ?? 10);
export const CRON_SECRET = process.env.CRON_SECRET ?? "";
export const KIOSK_KEY = process.env.KIOSK_KEY ?? "";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export function currentQrSecret(): string {
  const s = process.env.QR_SECRET_CURRENT;
  if (!s) throw new Error("QR_SECRET_CURRENT is not set");
  return s;
}

export function previousQrSecret(): string | null {
  return process.env.QR_SECRET_PREVIOUS || null;
}