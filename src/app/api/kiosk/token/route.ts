import { NextResponse } from "next/server";
import { createHmac, randomUUID } from "crypto";
import QRCode from "qrcode";
import { mintQrToken } from "@/lib/qr";
import { KIOSK_KEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function newKioskCookie(): Promise<{ name: string; value: string }> {
  const nonce = randomUUID();
  const sig = createHmac("sha256", KIOSK_KEY).update(nonce).digest("hex");
  return { name: "kiosk_auth", value: `${nonce}.${sig}` };
}

export function kioskCookieOk(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const [nonce, sig] = raw.split(".");
  if (!nonce || !sig) return false;
  const expect = createHmac("sha256", KIOSK_KEY).update(nonce).digest("hex");
  return sig === expect;
}

/**
 * Kiosk QR mint. Authenticated by either the x-kiosk-key header or the signed
 * kiosk_auth cookie set by the /kiosk server page (the key never ships to the
 * browser). Returns the signed token plus a rendered QR so the kiosk page
 * never bundles a QR library or the signing secret.
 */
export async function GET(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const cookieOk = cookies.split(/;\s*/).some((c) => {
    const [name, ...rest] = c.split("=");
    return name === "kiosk_auth" && kioskCookieOk(decodeURIComponent(rest.join("=")));
  });
  if (request.headers.get("x-kiosk-key") !== KIOSK_KEY && !cookieOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { token, jti, expiresAt } = await mintQrToken();
  const qr = await QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 1, width: 640 });
  void jti; // jti is recorded server-side on use; exposed for debugging only
  return NextResponse.json({ token, qr, expiresAt: expiresAt.toISOString() });
}