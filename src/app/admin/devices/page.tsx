import { collections } from "@/lib/mongo";
import { setDeviceStatus } from "@/actions/admin";
import { ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Devices" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminDevicesPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const devices = await collections().devices.find({}).sort({ created_at: 1 }).toArray();
  const employees = await collections().employees.find({}).toArray();
  const nameOf = new Map(employees.map((e) => [e._id.toString(), e.name]));

  return (
    <div>
      <h1 className="text-xl font-semibold">Devices</h1>
      <ErrorBanner message={error} />
      <p className="mt-1 text-sm text-slate-400">
        One device per install. A new device is <span className="text-amber-300">pending</span> until you approve it —
        only approved devices can check in. Revoking a phone forces re-approval.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Token (short)</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Registered</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d._id.toString()} className="border-b border-slate-800/60 last:border-0">
                <td className="px-4 py-2 font-medium">{nameOf.get(d.employee_id.toString()) ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{d.device_token.slice(0, 12)}…</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      d.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : d.status === "pending"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-400">{d.created_at.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</td>
                <td className="px-4 py-2">
                  {d.status !== "approved" && (
                    <form action={setDeviceStatus} className="inline">
                      <input type="hidden" name="id" value={d._id.toString()} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="mr-3 text-emerald-400 hover:underline">Approve</button>
                    </form>
                  )}
                  {d.status !== "revoked" && (
                    <form action={setDeviceStatus} className="inline">
                      <input type="hidden" name="id" value={d._id.toString()} />
                      <input type="hidden" name="status" value="revoked" />
                      <button className="text-rose-400 hover:underline">Revoke</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No devices yet — they appear when someone scans on a new phone.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}