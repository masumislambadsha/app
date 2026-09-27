import { collections } from "@/lib/mongo";
import { saveEmployee, toggleEmployeeActive } from "@/actions/admin";
import { ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Employees" };

const WEEK_OPTIONS: Array<[string, string]> = [
  ["0", "Sun"],
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminEmployeesPage({ searchParams }: Props) {
  const query = await searchParams;
  const editId = typeof query?.edit === "string" ? query.edit : null;
  const error = typeof query?.error === "string" ? query.error : null;

  const [employees, shifts] = await Promise.all([
    collections().employees.find({}).sort({ name: 1 }).toArray(),
    collections().shifts.find({}).toArray(),
  ]);
  const editing = editId ? employees.find((e) => e._id.toString() === editId) : null;

return (
    <div>
      <h1 className="text-xl font-semibold">Employees</h1>
      <ErrorBanner message={error} />

      <form action={saveEmployee} className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-300">{editing ? `Edit ${editing.name}` : "Add employee"}</h2>
        {editing && <input type="hidden" name="id" value={editing._id.toString()} />}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input name="name" defaultValue={editing?.name} required placeholder="Full name" className="input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" />
          <input name="email" type="email" defaultValue={editing?.email} required placeholder="Email" className="input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" />
          <select name="shift_id" defaultValue={editing?.shift_id} className="input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
            {shifts.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="joined_at" type="date" defaultValue={editing?.joined_at} required className="input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" />
          <input name="monthly_gross" type="number" min={0} defaultValue={editing?.monthly_gross} placeholder="Monthly gross (BDT)" className="input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" />
          <div className="col-span-2">
            <span className="mr-2 text-sm text-slate-400">Weekly off:</span>
            <div className="inline-flex flex-wrap gap-2">
              {WEEK_OPTIONS.map(([v, label]) => (
                <label key={v} className="flex items-center gap-1 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    name="weekly_off"
                    value={v}
                    defaultChecked={editing?.weekly_off.includes(Number(v)) ?? false}
                    className="accent-sky-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="accent-sky-500" />
            Active
          </label>
        </div>
        <button className="mt-3 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500">
          {editing ? "Save changes" : "Add employee"}
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Shift</th>
              <th className="px-4 py-2">Weekly off</th>
              <th className="px-4 py-2">Gross</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e._id.toString()} className="border-b border-slate-800/60 last:border-0">
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2 text-slate-300">{e.email}</td>
                <td className="px-4 py-2 text-slate-300">{e.shift_id}</td>
                <td className="px-4 py-2 text-slate-300">{e.weekly_off.map((d) => WEEK_OPTIONS[d]?.[1]).join(", ")}</td>
                <td className="px-4 py-2 text-slate-300">{e.monthly_gross.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-300">{e.joined_at}</td>
                <td className="px-4 py-2">{e.active ? <span className="text-emerald-400">yes</span> : <span className="text-slate-500">no</span>}</td>
                <td className="px-4 py-2">
                  <a href={`/admin/employees?edit=${e._id}`} className="mr-3 text-sky-400 hover:underline">
                    Edit
                  </a>
                  <form action={toggleEmployeeActive} className="inline">
                    <input type="hidden" name="id" value={e._id.toString()} />
                    <button className="text-slate-400 hover:underline">{e.active ? "Deactivate" : "Activate"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
