import { collections } from "@/lib/mongo";
import { computeDay, nowDateKey } from "@/attend/service";
import { latestJobRun } from "@/attend/payroll";
import { Card, Row, StatusBadge } from "@/components/ui";
import { weekdayOf } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminTodayPage() {
  const today = nowDateKey();
  const employees = await collections().employees.find({ active: true }).sort({ name: 1 }).toArray();
  const rows = await Promise.all(
    employees.map(async (emp) => {
      const day = await computeDay(emp, today);
      return { emp, day };
    }),
  );

  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.day.output.status] = (counts[r.day.output.status] ?? 0) + 1;

  const job = await latestJobRun();

  const weeks: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdayOf(today);

  return (
    <div>
      <h1 className="text-xl font-semibold">Today · {today}</h1>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k} className="p-3">
            <div className="text-xs text-slate-400">{k.replace("_", " ")}</div>
            <div className="mt-1 text-2xl font-semibold">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Shift</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">In</th>
              <th className="px-4 py-2">Out</th>
              <th className="px-4 py-2">Late</th>
              <th className="px-4 py-2">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.emp._id.toString()} className="border-b border-slate-800/60 last:border-0">
                <td className="px-4 py-2">{r.emp.name}</td>
                <td className="px-4 py-2 text-slate-400">
                  {r.emp.shift_id}
                  {r.emp.weekly_off.includes(weekday) && <span className="ml-1 text-xs">({weeks[weekday]} off)</span>}
                </td>
                <td className="px-4 py-2"><StatusBadge status={r.day.output.status} /></td>
                <td className="px-4 py-2 text-slate-300">
                  {r.day.checkInAt ? r.day.checkInAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "—"}
                </td>
                <td className="px-4 py-2 text-slate-300">
                  {r.day.checkOutAt ? r.day.checkOutAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "—"}
                </td>
                <td className="px-4 py-2">{r.day.lateMin > 0 ? `${r.day.lateMin}m` : "—"}</td>
                <td className="px-4 py-2">
                  {r.day.output.flag ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">{r.day.output.flag}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4 p-4 text-sm">
        <Row label="Nightly status job" value={job ? `${job.status} · ${job.date ?? ""} · ${job.processed ?? 0} rows` : "never run"} />
        <Row label="Weekday" value={weeks[weekday]} />
      </Card>
    </div>
  );
}