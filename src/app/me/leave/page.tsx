import { collections } from "@/lib/mongo";
import { requireEmployee } from "@/auth";
import { getAllLeaveTypes, availableBalance } from "@/attend/leave";
import { nowDateKey } from "@/attend/service";
import { Card, ErrorBanner } from "@/components/ui";
import { LeaveRequestForm } from "@/components/LeaveRequestForm";
import { cancelMyLeave } from "@/actions/leave";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request leave" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MyLeavePage({ searchParams }: Props) {
  const query = await searchParams;
  const error = typeof query?.error === "string" ? query.error : null;
  const user = await requireEmployee();
  const employee = await collections().employees.findOne({ email: user.email.toLowerCase(), active: true });
  const today = nowDateKey();
  const year = Number(today.slice(0, 4));

  if (!employee) {
    return (
      <Card className="m-6 p-6">
        <p className="text-sm text-amber-300">No active employee record for {user.email}.</p>
      </Card>
    );
  }

  const types = await getAllLeaveTypes();
  const options = await Promise.all(
    types.map(async (t) => ({ id: t._id, name: t.name, paid: t.paid, balance: await availableBalance(employee._id, t._id, year) })),
  );

  const myRequests = await collections()
    .leaveRequests.find({ employee_id: employee._id, status: { $in: ["pending", "approved"] } })
    .sort({ created_at: -1 })
    .toArray();

  const typeName = new Map(types.map((t) => [t._id, t.name]));

  return (
    <div>
      <h1 className="text-xl font-semibold">Request leave</h1>
      <ErrorBanner message={error} />

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-medium text-slate-300">New request</h2>
        <LeaveRequestForm types={options} today={today} />
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="font-medium">My open requests</h2>
        <div className="mt-2 space-y-2">
          {myRequests.map((r) => (
            <div key={r._id.toString()} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 py-2 text-sm last:border-0">
              <div>
                <span className="font-medium">{typeName.get(r.type_id) ?? r.type_id}</span>
                <span className="ml-2 text-slate-400">
                  {r.from} → {r.to} {r.half_day ? "(½)" : ""}
                </span>
                {r.status === "approved" ? (
                  <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-300">approved</span>
                ) : (
                  <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">pending</span>
                )}
              </div>
              {r.status === "pending" && (
                <form action={cancelMyLeave}>
                  <input type="hidden" name="id" value={r._id.toString()} />
                  <button className="text-slate-400 underline-offset-2 hover:underline">Cancel</button>
                </form>
              )}
            </div>
          ))}
          {myRequests.length === 0 && <p className="text-sm text-slate-500">Nothing open.</p>}
        </div>
      </Card>
    </div>
  );
}