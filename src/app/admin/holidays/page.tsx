import { collections } from "@/lib/mongo";
import { addHoliday, removeHoliday } from "@/actions/admin";
import { ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holidays" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminHolidaysPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const holidays = await collections().holidays.find({}).sort({ _id: 1 }).toArray();

  return (
    <div>
      <h1 className="text-xl font-semibold">BD holiday calendar</h1>
      <ErrorBanner message={error} />

      <form action={addHoliday} className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm text-slate-300">Date</span>
            <input name="date" type="date" required className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-slate-300">Name</span>
            <input name="name" required placeholder="e.g. Independence Day" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500">Add holiday</button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={String(h._id)} className="border-b border-slate-800/60 last:border-0">
                <td className="px-4 py-2">{String(h._id)}</td>
                <td className="px-4 py-2">{h.name}</td>
                <td className="px-4 py-2 text-right">
                  <form action={removeHoliday} className="inline">
                    <input type="hidden" name="date" value={String(h._id)} />
                    <button className="text-rose-400 hover:underline">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No holidays yet — load the 2026–27 BD govt calendar at setup.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}