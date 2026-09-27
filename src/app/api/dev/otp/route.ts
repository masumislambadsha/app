import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function devOtp(email: string): string {
  const hash = [...email].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000000, 7);
  return String(hash).padStart(6, "0");
}

// Development-only helper so the OTP flow can be exercised without reading logs.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev endpoint disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? "";
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  return NextResponse.json({ email, otp: devOtp(email.toLowerCase()) });
}