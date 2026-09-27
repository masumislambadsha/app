import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP } from "better-auth/plugins/email-otp";
import { headers } from "next/headers";
import { getDb, getMongoClient } from "@/lib/mongo";
import { sendOtpCode } from "@/lib/email";
import { roleForEmail } from "@/attend/roles";
import type { Role } from "@/attend/types";

let _auth: ReturnType<typeof createAuth> | null = null;

function createAuth() {
  return betterAuth({
    database: mongodbAdapter(getDb(), { client: getMongoClient(), transaction: false }),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          input: false,
          output: true,
          defaultValue: "employee",
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        resendStrategy: "reuse",
        rateLimit: { window: 60, max: 5 },
        sendVerificationOTP: async ({ email, otp }) => {
          await sendOtpCode(email, otp);
        },
        generateOTP: ({ email }) => {
          // Dev convenience: a stable 6-digit code derived from the email so
          // the flow can be exercised without reading logs. Never enabled in prod.
          if (process.env.NODE_ENV !== "production") {
            const hash = [...email].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000000, 7);
            return String(hash).padStart(6, "0");
          }
          return undefined;
        },
      }),
    ],
  });
}

export function getAuth() {
  if (!_auth) _auth = createAuth();
  return _auth;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role | null;
}

export async function currentSession() {
  const h = await headers();
  const session = await getAuth().api.getSession({ headers: Object.fromEntries(h.entries()) });
  if (!session?.user?.email) return null;
  const role = await roleForEmail(session.user.email);
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
    } satisfies AuthUser,
  };
}

export async function requireEmployee(): Promise<AuthUser> {
  const s = await currentSession();
  if (!s || !s.user.role) throw new Error("auth:not-allowed");
  return s.user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const s = await currentSession();
  if (!s || s.user.role !== "admin") throw new Error("auth:admin-only");
  return s.user;
}