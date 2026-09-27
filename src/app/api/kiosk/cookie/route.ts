import { NextResponse } from "next/server";
import { newKioskCookie } from "@/app/api/kiosk/token/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const { name, value } = await newKioskCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}