import { collections } from "@/lib/mongo";
import { decideLeave } from "@/actions/leave";
import { ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaves" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  cancelled: "bg-slate-600/20 text-slate-400",
};

export default async function AdminLeavesPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const [requests, employees, types] = await Promise.all([
    collections().leaveRequests.find({}).sort({ created_at: -1 }).toArray(),
    collections().employees.find({}).toArray(),
    collections().leaveTypes.find({}).toArray(),
  ]);
  const nameOf = new Map(employees.map((e) => [e._id.toString(), e.name]));
  const typeName = new Map(types.map((t) => [t._id, t.name]));

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <h1 className="text-xl font-semibold">Leave requests</h1>
      <ErrorBanner message={error} />

      <h2 className="mt-5 text-lg font-semibold">Awaiting decision ({pending.length})</h2>
      <div className="mt-2 space-y-2">
        {pending.map((r) => (
          <div
            key={r._id.toString()}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-800/50 bg-amber-900/10 p-4"
          >
            <div>
              <p className="font-medium">
                {nameOf.get(r.employee_id.toString()) ?? "?"}{" "}
                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                  {typeName.get(r.type_id) ?? r.type_id}
                </span>
                {r.half_day && <span className="ml-1 text-xs text-slate-400">half-day</span>}
              </p>
              <p className="text-sm text-slate-300">
                {r.from} → {r.to} · {r.requested_days} day(s)
              </p>
              {r.reason && <p className="mt-1 text-sm italic text-slate-400">“{r.reason}”</p>}
            </div>
            <div className="flex gap-2">
              <form action={decideLeave}>
                <input type="hidden" name="id" value={r._id.toString()} />
                <input type="hidden" name="action" value="approved" />
                <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">Approve</button>
              </form>
              <form action={decideLeave}>
                <input type="hidden" name="id" value={r._id.toString()} />
                <input type="hidden" name="action" value="rejected" />
                <button className="rounded-md bg-rose-700/80 px-3 py-1.5 text-sm font-medium hover:bg-rose-600">Reject</button>
              </form>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-sm text-slate-500">Nothing waiting.</p>}
      </div>

      <h2 className="mt-6 text-lg font-semibold">History ({history.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Dates</th>
              <th className="px-4 py-2">Days</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr key={r._id.toString()} className="border-b border-slate-800/60 last:border-0">
                <td className="px-4 py-2">{nameOf.get(r.employee_id.toString()) ?? "?"}</td>
                <td className="px-4 py-2">{typeName.get(r.type_id) ?? r.type_id}</td>
                <td className="px-4 py-2">
                  {r.from} → {r.to}
                  {r.half_day ? " (½)" : ""}
                </td>
                <td className="px-4 py-2">{r.requested_days}</td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2 text-slate-400">{r.created_at.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}