// Idempotent demo accounts: one extra admin + a few employees.
// Roles: "admin" via ADMIN_EMAIL (comma-separated), "employee" via an active
// employees record. Login is passwordless OTP; in dev the code shown on the
// login page is deterministic per email and printed here too.
// Usage: node scripts/seed-demo.mjs   (requires MONGODB_URI; sets ADMIN_EMAIL)
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "attendance";

const DEMO = [
  { name: "Demo Admin", email: "demo.admin@demo.com", admin: true, gross: 0 },
  { name: "Demo Alice", email: "demo.alice@demo.com", gross: 45000 },
  { name: "Demo Bob", email: "demo.bob@demo.com", gross: 38000 },
  { name: "Demo Carol", email: "demo.carol@demo.com", gross: 30000 },
  { name: "Demo Dave", email: "demo.dave@demo.com", gross: 42000 },
  { name: "Demo Erin", email: "demo.erin@demo.com", gross: 35000 },
  { name: "Demo Frank", email: "demo.frank@demo.com", gross: 40000 },
];

function devOtp(email) {
  const hash = [...email].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000000, 7);
  return String(hash).padStart(6, "0");
}

const client = new MongoClient(uri, { appName: "office-attendance-demo" });
const db = client.db(dbName);

async function main() {
  const shift =
    (await db.collection("shifts").findOne({ _id: "day_shift" })) ??
    (await db.collection("shifts").findOne({}));
  const shiftId = shift ? shift._id : "day_shift";
  const emps = db.collection("employees");

  const adminEmails = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const d of DEMO) {
    const email = d.email.toLowerCase();
    await emps.updateOne(
      { email },
      {
        $set: {
          name: d.name,
          email,
          shift_id: shiftId,
          weekly_off: [5, 6],
          joined_at: new Date().toISOString().slice(0, 10),
          active: true,
          monthly_gross: d.gross,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );
    if (d.admin) adminEmails.push(email);
    console.log(
      `${d.admin ? "admin   " : "employee"}  ${email.padEnd(32)} code ${devOtp(email)}`
    );
  }

  console.log("ADMIN_EMAIL for .env.local:", adminEmails.join(","));
  await client.close();
}

await client.connect();
try {
  await main();
  console.log("Demo accounts ready.");
} catch (e) {
  console.error(e);
  process.exit(1);
}