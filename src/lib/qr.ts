import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { QR_EXPIRY_SECONDS, currentQrSecret, previousQrSecret } from "@/lib/constants";

export interface QrPayload {
  site: "office";
  jti: string;
  iat: number;
}

/** Mint a single-use, HMAC-signed, 45s-expiry QR token. JTI is unique per mint. */
export async function mintQrToken(): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const jti = randomUUID();
  const key = new TextEncoder().encode(currentQrSecret());
  const token = await new SignJWT({ site: "office" })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${QR_EXPIRY_SECONDS}s`)
    .sign(key);
  const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000);
  return { token, jti, expiresAt };
}

/**
 * Verify a QR token against the current (and, during rotation, the previous)
 * secret. Expired and malformed tokens are rejected.
 */
export async function verifyQrToken(token: string): Promise<QrPayload> {
  const candidates = [currentQrSecret(), previousQrSecret()].filter(Boolean) as string[];
  let lastError: unknown = null;
  for (const secret of candidates) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (payload.site !== "office") throw new Error("wrong site");
      if (typeof payload.jti !== "string") throw new Error("missing jti");
      const iat = typeof payload.iat === "number" ? payload.iat : 0;
      return { site: "office", jti: payload.jti, iat };
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error("invalid QR token", { cause: lastError });
}