// Idempotent DB bootstrap: indexes + seed config.
// Usage: node scripts/init-db.mjs   (requires MONGODB_URI; optionally ADMIN_EMAIL)
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "attendance";
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

const client = new MongoClient(uri, { appName: "office-attendance-init" });
const db = client.db(dbName);

async function ensureIndexes() {
  const tasks = [
    db.collection("employees").createIndex({ email: 1 }, { unique: true }),
    db.collection("employees").createIndex({ active: 1 }),
    db.collection("devices").createIndex({ employee_id: 1, device_token: 1 }, { unique: true }),
    db.collection("devices").createIndex({ status: 1 }),
    db.collection("shift_overrides").createIndex({ shift_id: 1, date_from: 1, date_to: 1 }),
    db.collection("check_ins").createIndex({ employee_id: 1, ts: 1 }),
    db.collection("daily_status").createIndex({ employee_id: 1, date: 1 }, { unique: true }),
    db.collection("leave_balances").createIndex({ employee_id: 1, type_id: 1, year: 1 }, { unique: true }),
    db.collection("leave_requests").createIndex({ employee_id: 1, status: 1, from: 1 }),
    db.collection("payroll_adjustments").createIndex({ employee_id: 1, month: 1 }, { unique: true }),
    db.collection("audit_log").createIndex({ ts: 1 }),
    db.collection("job_runs").createIndex({ job: 1, started_at: -1 }),
    // Single-use QR tokens: unique jti + 15-minute TTL auto-purge.
    db.collection("used_tokens").createIndex({ jti: 1 }, { unique: true }),
    db.collection("used_tokens").createIndex({ createdAt: 1 }, { expireAfterSeconds: 900 }),
    // Per-device rate limit: TTL 60s, key unique (_id).
    db.collection("rate_limits").createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 }),
  ];
  await Promise.all(tasks);
  console.log("indexes ensured");
}

async function seedConfig() {
  const leaveTypes = [
    { _id: "casual", name: "Casual", annual_quota: 10, earned_accrual: false, paid: true },
    { _id: "sick", name: "Sick", annual_quota: 14, earned_accrual: false, paid: true },
    { _id: "earned", name: "Earned", annual_quota: 0, earned_accrual: true, paid: true },
    { _id: "unpaid", name: "Unpaid", annual_quota: 1e9, earned_accrual: false, paid: false },
  ];
  const seen = db.collection("leave_types");
  for (const t of leaveTypes) {
    await seen.updateOne(
      { _id: t._id },
      { $setOnInsert: t },
      { upsert: true },
    );
  }

  const rules = [
    { _id: "lates_per_absent", value: 3, label: "Lates per absent-day (BD convention)" },
    { _id: "absent_day_divisor", value: 30, label: "Day rate = gross / 30" },
    { _id: "half_day_multiplier", value: 0.5, label: "Half-day = 0.5 x day rate" },
    { _id: "unpaid_leave_multiplier", value: 1, label: "Unpaid leave day = 1 x day rate" },
  ];
  const rulesColl = db.collection("deduction_rules");
  for (const r of rules) {
    await rulesColl.updateOne({ _id: r._id }, { $setOnInsert: r }, { upsert: true });
  }

  const shiftColl = db.collection("shifts");
  if ((await shiftColl.countDocuments({})) === 0) {
    await shiftColl.insertOne({
      _id: "general",
      name: "General",
      start_time: "09:00",
      end_time: "18:00",
      grace_min: 10,
      half_day_after_min: 60,
      early_exit_min: 60,
      created_at: new Date(),
    });
    console.log("seeded default shift 'general' (09:00-18:00)");
  }

  if (adminEmail) {
    const emps = db.collection("employees");
    const existing = await emps.findOne({ email: adminEmail });
    if (!existing) {
      const shift = await shiftColl.findOne({});
      await emps.insertOne({
        name: process.env.ADMIN_NAME || "Owner",
        email: adminEmail,
        shift_id: shift ? shift._id : "general",
        weekly_off: [5, 6],
        joined_at: new Date().toISOString().slice(0, 10),
        active: true,
        monthly_gross: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`seeded admin employee ${adminEmail} (role via ADMIN_EMAIL override)`);
    }
  }

  console.log("seed config ensured");
}

await client.connect();
try {
  await ensureIndexes();
  await seedConfig();
  console.log("DB ready.");
} finally {
  await client.close();
}