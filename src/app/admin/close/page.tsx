import { collections } from "@/lib/mongo";
import { closeMonthAction, reopenMonthAction, updateDeductionRule } from "@/actions/admin";
import { latestJobRun } from "@/attend/payroll";
import { monthLabel } from "@/attend/leave";
import { Card, Row, ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monthly close" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminClosePage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const [rules, closes, job, now] = await Promise.all([
    collections().deductionRules.find({}).sort({ _id: 1 }).toArray(),
    collections().payrollCloses.find({}).sort({ _id: 1 }).toArray(),
    latestJobRun(),
    Promise.resolve(new Date()),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Monthly close</h1>
      <ErrorBanner message={error} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-medium">Close a month</h2>
          <p className="mt-1 text-sm text-slate-400">
            Locks the month&apos;s statuses, computes deductions (see rules), credits earned leave, and writes
            payroll_adjustments. A second close of the same month is refused.
          </p>
          <form action={closeMonthAction} className="mt-3 flex items-end gap-3">
            <label className="block">
              <span className="text-sm text-slate-300">Month</span>
              <input name="month" type="month" required defaultValue={presentMonth(now)} className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
            <button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500">Close month</button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="font-medium">Reopen a month</h2>
          <p className="mt-1 text-sm text-slate-400">
            Unlocks corrections for a closed month. Re-closing recomputes and overwrites that month&apos;s adjustments.
          </p>
          <form action={reopenMonthAction} className="mt-3 flex items-end gap-3">
            <select name="month" className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              {closes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c._id} ({monthLabel(c._id)})
                </option>
              ))}
            </select>
            <button className="rounded-md bg-rose-700/80 px-4 py-2 text-sm font-medium hover:bg-rose-600">Reopen</button>
          </form>
          {closes.length === 0 && <p className="mt-2 text-sm text-slate-500">No closed months yet.</p>}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="font-medium">Deduction rules (config — editable)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {rules.map((r) => (
            <form key={r._id} action={updateDeductionRule} className="flex items-center gap-2">
              <input type="hidden" name="key" value={r._id} />
              <input type="hidden" name="label" value={r.label} />
              <span className="flex-1 text-sm text-slate-300">
                {r.label}
                <span className="block font-mono text-xs text-slate-500">{r._id}</span>
              </span>
              <input
                name="value"
                type="number"
                step="any"
                defaultValue={r.value}
                className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
              <button className="rounded-md bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600">Save</button>
            </form>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-4 text-sm">
        <Row
          label="Nightly status job"
          value={job ? `${job.status} · target ${job.date ?? "—"} · ${job.processed ?? 0} rows` : "never run"}
        />
        <Row label="Closed months" value={closes.length ? closes.map((c) => c._id).join(", ") : "none"} />
      </Card>
    </div>
  );
}

function presentMonth(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}