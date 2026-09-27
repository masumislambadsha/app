import { collections } from "@/lib/mongo";
import { saveShift } from "@/actions/admin";
import { ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shifts" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminShiftsPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const shifts = await collections().shifts.find({}).sort({ _id: 1 }).toArray();
  const overrides = await collections().shiftOverrides.find({}).sort({ date_from: 1 }).toArray();

  return (
    <div>
      <h1 className="text-xl font-semibold">Shifts</h1>
      <ErrorBanner message={error} />

      <form action={saveShift} className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-300">Add / edit shift</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="name" required placeholder="Name (e.g. General)" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input name="start_time" type="time" defaultValue="09:00" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input name="end_time" type="time" defaultValue="18:00" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input name="grace_min" type="number" min={0} defaultValue={10} placeholder="Grace (min)" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input name="half_day_after_min" type="number" min={0} defaultValue={60} placeholder="Half-day after" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input name="early_exit_min" type="number" min={0} defaultValue={60} placeholder="Early-exit (min)" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        </div>
        <button className="mt-3 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500">Save shift</button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {shifts.map((s) => (
          <div key={s._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{s.name}</h3>
              <span className="text-sm text-slate-400">{s._id}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {s.start_time}–{s.end_time} · grace {s.grace_min}m · half-day after {s.half_day_after_min}m · early-exit{" "}
              {s.early_exit_min}m
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-semibold">Shift overrides (Ramadan / seasonal hours)</h2>
      <p className="text-sm text-slate-400">
        Overrides are stored by date range. Add them via MongoDB (no UI in v1) — e.g.{" "}
        <code className="rounded bg-slate-800 px-1 text-xs">shift_overrides</code>.
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2">Shift</th>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Hours</th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o._id.toString()}>
                <td className="px-4 py-2">{o.shift_id}</td>
                <td className="px-4 py-2">{o.date_from}</td>
                <td className="px-4 py-2">{o.date_to}</td>
                <td className="px-4 py-2">{o.start_time}–{o.end_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}