import { NextResponse } from "next/server";
import { collections } from "@/lib/mongo";
import { CRON_SECRET } from "@/lib/constants";
import { addDays, diffDays } from "@/lib/time";
import { computeDay, lastMaterializedDate, materializeDay, nowDateKey } from "@/attend/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BACKFILL_DAYS = 31;

/**
 * Vercel Cron (schedule 0 18 * * * UTC = 00:00-00:59 Dhaka, see README).
 * Computes the *previous* Dhaka date so the job never races midnight scans.
 *
 * Self-healing: if the job was down, each run back-fills any missing dates
 * since the last successful run (capped so a cold first run stays bounded).
 * Idempotent: daily_status upserts keyed (employee_id, date); manual rows are
 * never overwritten (see materializeDay).
 */
export async function GET(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const queryKey = new URL(request.url).searchParams.get("cron");
  if ((bearer && bearer === CRON_SECRET) || (queryKey && queryKey === CRON_SECRET)) {
    // authorized
  } else {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = new Date();
  const job = await collections().jobRuns.insertOne({
    _id: started.getTime().toString() + "." + ((await collections().jobRuns.countDocuments({})) + Math.random()),
    job: "daily-status",
    started_at: started,
    status: "running",
  });

  try {
    const target = addDays(nowDateKey(), -1); // previous Dhaka date
    const last = await lastMaterializedDate();
    let from = target;
    if (last && last < target) from = addDays(last, 1);

    // Bound the first run / long outages.
    if (diffDays(from, target) >= MAX_BACKFILL_DAYS) from = addDays(target, -(MAX_BACKFILL_DAYS - 1));

    const employees = await collections().employees.find({ active: true }).toArray();
    let processed = 0;
    let skipped = 0;
    const total = diffDays(from, target);
    for (let i = 0; i <= total; i++) {
      const date = addDays(from, i);
      for (const emp of employees) {
        try {
          const computed = await computeDay(emp, date);
          await materializeDay(computed);
          processed++;
        } catch {
          skipped++;
        }
      }
    }

    await collections().jobRuns.updateOne(
      { _id: job.insertedId },
      { $set: { status: "ok", finished_at: new Date(), date: target, processed, skipped } },
    );

    return NextResponse.json({
      ok: true,
      target,
      from,
      dates: total + 1,
      employees: employees.length,
      processed,
      skipped,
      ms: Date.now() - started.getTime(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    await collections().jobRuns.updateOne(
      { _id: job.insertedId },
      { $set: { status: "error", finished_at: new Date(), error: msg } },
    );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}