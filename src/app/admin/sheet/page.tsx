import Link from "next/link";
import { collections } from "@/lib/mongo";
import { manualCorrect } from "@/actions/admin";
import { monthlySheet } from "@/attend/payroll";
import { monthLabel } from "@/attend/leave";
import { daysInMonth, rangeKeys } from "@/lib/time";
import { DAY_STATUSES, DayStatus } from "@/attend/types";
import { ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monthly sheet" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminSheetPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const month = typeof query?.month === "string" && /^\d{4}-\d{2}$/.test(query.month) ? query.month : currentMonth();
  const [sheet, employees, closes, holidays] = await Promise.all([
    monthlySheet(month),
    collections().employees.find({ active: true }).sort({ name: 1 }).toArray(),
    collections().payrollCloses.find({ _id: month }).toArray(),
    collections().holidays.find({ _id: { $regex: `^${month}-` } }).toArray(),
  ]);
  const holidaySet = new Set(holidays.map((h) => String(h._id)));
  const isClosed = closes.length > 0;
  const totalDays = daysInMonth(month);
  const holidayCount = rangeKeys(`${month}-01`, `${month}-${String(totalDays).padStart(2, "0")}`).filter((d) =>
    holidaySet.has(d),
  ).length;

  return (
    <div>
      <h1 className="text-xl font-semibold">Monthly sheet · {monthLabel(month)}</h1>
      <ErrorBanner message={error} />

      <form className="mt-3 flex items-end gap-3">
        <label className="block">
          <span className="text-sm text-slate-300">Month</span>
          <input name="month" type="month" defaultValue={month} className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        </label>
        <button className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600">Show</button>
        {isClosed ? (
          <span className="rounded bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">closed — corrections blocked</span>
        ) : (
          <span className="rounded bg-amber-500/15 px-2 py-1 text-xs text-amber-300">open — corrections allowed</span>
        )}
        {sheet.length > 0 && (
          <>
            <a
              href={`/api/admin/sheet?month=${month}&format=csv`}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500"
            >
              CSV
            </a>
            <a
              href={`/api/admin/sheet?month=${month}&format=json`}
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
            >
              v1 JSON
            </a>
          </>
        )}
      </form>

      {sheet.length === 0 ? (
        <p className="mt-6 text-sm text-amber-300">
          No adjustments yet — run <Link className="underline" href="/admin/close">Monthly close</Link> for this month first.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Work</th>
                <th className="px-3 py-2">P</th>
                <th className="px-3 py-2">Late</th>
                <th className="px-3 py-2">½</th>
                <th className="px-3 py-2">Abs</th>
                <th className="px-3 py-2">L(p)</th>
                <th className="px-3 py-2">L(u)</th>
                <th className="px-3 py-2">Ded days</th>
                <th className="px-3 py-2">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {sheet.map((r) => (
                <tr key={r.employee_id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.working_days}</td>
                  <td className="px-3 py-2 text-emerald-300">{r.present}</td>
                  <td className="px-3 py-2 text-amber-300">{r.late}</td>
                  <td className="px-3 py-2 text-orange-300">{r.half_days}</td>
                  <td className="px-3 py-2 text-rose-300">{r.absents}</td>
                  <td className="px-3 py-2 text-sky-300">{r.leave_paid}</td>
                  <td className="px-3 py-2 text-violet-300">{r.leave_unpaid}</td>
                  <td className="px-3 py-2 font-semibold">{r.deduction_days}</td>
                  <td className="px-3 py-2 font-semibold">{r.deduction_amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-slate-500">
            {totalDays} calendar days · {holidayCount} holidays in month. Deduction days = absents − floor(lates / 3) − approved
            unpaid leave; amount = gross / 30 × deduction days.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-medium">Manual correction</h2>
        <p className="mt-1 text-sm text-slate-400">
          Overrides a day&apos;s status with a mandatory reason. Every correction is appended to the audit log. Blocked while
          the month is closed{" "}
          {isClosed ? <span className="text-amber-300">— reopen it first.</span> : <span>— month is open.</span>}
        </p>
        <form action={manualCorrect} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select name="employee_id" required className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            {employees.map((e) => (
              <option key={e._id.toString()} value={e._id.toString()}>
                {e.name}
              </option>
            ))}
          </select>
          <input name="date" type="date" required className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <select name="status" required className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            {DAY_STATUSES.filter((s) => s !== "weekend" && s !== "holiday").map((s: DayStatus) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            name="reason"
            required
            placeholder="Reason (mandatory)"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            disabled={isClosed}
            className="rounded-md bg-rose-700/80 px-4 py-2 text-sm font-bold hover:bg-rose-600 disabled:opacity-40"
          >
            Apply correction
          </button>
        </form>
      </div>
    </div>
  );
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}