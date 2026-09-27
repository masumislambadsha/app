import { collections } from "@/lib/mongo";
import { requireEmployee } from "@/auth";
import { computeDay, nowDateKey } from "@/attend/service";
import { getAllLeaveTypes, availableBalance } from "@/attend/leave";
import { daysInMonth, rangeKeys, weekdayOf } from "@/lib/time";
import { Card, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My attendance" };

const GRID_STYLES: Record<string, string> = {
  present: "bg-emerald-500/20 text-emerald-200",
  late: "bg-amber-500/20 text-amber-200",
  half_day: "bg-orange-500/20 text-orange-200",
  absent: "bg-rose-500/20 text-rose-200",
  leave: "bg-sky-500/20 text-sky-200",
  weekend: "bg-slate-800 text-slate-500",
  holiday: "bg-violet-500/20 text-violet-200",
};

export default async function MyAttendancePage() {
  const user = await requireEmployee();
  const employee = await collections().employees.findOne({ email: user.email.toLowerCase(), active: true });
  const today = nowDateKey();

  if (!employee) {
    return (
      <Card className="m-6 p-6">
        <p className="text-sm text-amber-300">
          Logged in as {user.email} but no active employee record exists. Ask an admin to add you.
        </p>
      </Card>
    );
  }

  const day = await computeDay(employee, today);
  const month = today.slice(0, 7);
  const totalDays = daysInMonth(month);
  const keys = rangeKeys(`${month}-01`, `${month}-${String(totalDays).padStart(2, "0")}`);

  const cellDays = await Promise.all(
    keys.map(async (k) => ({ key: k, status: (await computeDay(employee, k)).output.status })),
  );

  const year = Number(month.slice(0, 4));
  const types = await getAllLeaveTypes();
  const balances = await Promise.all(
    types.map(async (t) => ({ type: t, balance: await availableBalance(employee._id, t._id, year) })),
  );

  const myRequests = await collections()
    .leaveRequests.find({ employee_id: employee._id })
    .sort({ created_at: -1 })
    .toArray();

  const weeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDow = weekdayOf(`${month}-01`);
  const blanks = Array.from({ length: firstDow });
  const cells: Array<{ key: string; status: string } | null> = [
    ...blanks.map(() => null),
    ...cellDays.map((c) => ({ key: c.key, status: c.status })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{employee.name}</h1>
        <StatusBadge status={day.output.status} />
        {day.output.flag && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">{day.output.flag}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-400">
        {today}
        {day.checkInAt &&
          ` · in ${day.checkInAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" })}`}
        {day.checkOutAt &&
          ` · out ${day.checkOutAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" })}`}
      </p>
      {day.lateMin > 0 && <p className="mt-1 text-xs text-amber-300">Late by {day.lateMin} minutes</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-medium">Leave balance ({year})</h2>
          <div className="mt-2 space-y-2">
            {balances.map(({ type, balance }) => (
              <div key={type._id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {type.name} {type.paid ? "" : "(unpaid)"}
                </span>
                <span className="font-semibold">{balance.toFixed(balance % 1 === 0 ? 0 : 1)}</span>
              </div>
            ))}
          </div>
          <a
            href="/me/leave"
            className="mt-4 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500"
          >
            Request leave
          </a>
          <a
            href="/scan"
            className="mt-4 ml-2 inline-block rounded-md bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
          >
            Open scanner
          </a>
        </Card>

        <Card className="p-4">
          <h2 className="font-medium">My requests</h2>
          <div className="mt-2 space-y-2">
            {myRequests.slice(0, 8).map((r) => (
              <div key={r._id.toString()} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {r.from} → {r.to} {r.half_day ? "(½)" : ""}
                </span>
                <span className="text-slate-500">{r.status}</span>
              </div>
            ))}
            {myRequests.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="font-medium">This month · {month}</h2>
        <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
          {weeks.map((w) => (
            <div key={w} className="text-xs text-slate-500">
              {w}
            </div>
          ))}
          {cells.map((c, i) =>
            c ? (
              <div
                key={c.key}
                title={c.key}
                className={`rounded-md p-2 text-xs font-medium ${GRID_STYLES[c.status] ?? "bg-slate-800 text-slate-400"}`}
              >
                {Number(c.key.slice(8))}
              </div>
            ) : (
              <div key={`blank-${i}`} />
            ),
          )}
        </div>
      </Card>
    </div>
  );
}