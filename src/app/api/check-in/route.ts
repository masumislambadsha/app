import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongo";
import { requireEmployee } from "@/auth";
import { verifyQrToken } from "@/lib/qr";
import { CHECKIN_RATE_LIMIT, DUPLICATE_SCAN_WINDOW_MIN } from "@/lib/constants";
import { computeDay, getDayCheckIns, materializeDay, nowDateKey } from "@/attend/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function allowRate(key: string): Promise<boolean> {
  const res = await collections().rateLimits.findOneAndUpdate(
    { _id: key },
    { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );
  return (res?.count ?? CHECKIN_RATE_LIMIT + 1) <= CHECKIN_RATE_LIMIT;
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireEmployee();
  } catch {
    return NextResponse.json({ error: "sign-in required", code: "not_authed" }, { status: 401 });
  }
  if (!user.role) {
    return NextResponse.json({ error: "no active employee record for this email", code: "no_employee" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { token?: string; device_token?: string };
  const { token, device_token } = body;
  if (!token || !device_token) {
    return NextResponse.json({ error: "token and device_token required", code: "bad_request" }, { status: 400 });
  }

  try {
    // 1. QR signature + expiry (45s) — proves presence at the kiosk.
    const payload = await verifyQrToken(token);

    const employee = await collections().employees.findOne({ email: user.email.toLowerCase(), active: true });
    if (!employee) {
      return NextResponse.json({ error: "employee not found", code: "no_employee" }, { status: 404 });
    }

    // 2. Device binding — scan only counts from this employee's approved device.
    const device = await collections().devices.findOne({
      employee_id: employee._id,
      device_token,
    });
    if (!device) {
      return NextResponse.json({ error: "device not registered", code: "device_unregistered" }, { status: 403 });
    }
    if (device.status !== "approved") {
      return NextResponse.json({ error: "device not approved by admin", code: "device_pending" }, { status: 403 });
    }

    // 3. Per-device rate limit, bucketed per 5-minute window (Atlas-backed TTL counter).
    const now = new Date();
    const windowStart = Math.floor(now.getTime() / (5 * 60_000));
    const allowed = await allowRate(
      `ci:${createHash("sha256").update(device_token).digest("hex")}:${windowStart}`,
    );
    if (!allowed) {
      return NextResponse.json({ error: "too many attempts", code: "rate_limited" }, { status: 429 });
    }

    // 4. Single-use token — insert jti first; a replay hits the unique index.
    try {
      await collections().usedTokens.insertOne({ _id: new ObjectId(), jti: payload.jti, createdAt: now });
    } catch {
      return NextResponse.json({ error: "token already used", code: "token_replayed" }, { status: 409 });
    }

    // 5. Duplicate-window protection: ignore scans within the window of the last one.
    const lastScan = await collections().checkIns
      .find({ employee_id: employee._id })
      .sort({ ts: -1 })
      .limit(1)
      .toArray();
    if (lastScan[0] && now.getTime() - lastScan[0].ts.getTime() < DUPLICATE_SCAN_WINDOW_MIN * 60_000) {
      return NextResponse.json({ error: "duplicate scan ignored", code: "duplicate", ignored: true }, { status: 202 });
    }

    // 6. First scan of the day = check-in; any later scan = (overrides) check-out.
    const today = nowDateKey();
    const todayCount = (await getDayCheckIns(employee._id, today)).length;
    const kind: "in" | "out" = todayCount === 0 ? "in" : "out";

    await collections().checkIns.insertOne({
      _id: new ObjectId(),
      employee_id: employee._id,
      ts: now,
      kind,
      token_jti: payload.jti,
      meta: {},
      device_token,
    });

    // 7. Refresh the live daily_status for today.
    const computed = await computeDay(employee, today);
    await materializeDay(computed);

    return NextResponse.json({
      ok: true,
      kind,
      date: today,
      checkedAt: now.toISOString(),
      status: computed.output.status,
      message: kind === "in" ? "Checked in" : "Checked out",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg, code: "invalid_token" }, { status: 401 });
  }
}