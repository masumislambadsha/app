import Link from "next/link";
import type { DayStatus } from "@/attend/types";

export function StatusBadge({ status }: { status: DayStatus }) {
  const styles: Record<DayStatus, string> = {
    present: "bg-emerald-500/15 text-emerald-300 border-emerald-700",
    late: "bg-amber-500/15 text-amber-300 border-amber-700",
    half_day: "bg-orange-500/15 text-orange-300 border-orange-700",
    absent: "bg-rose-500/15 text-rose-300 border-rose-700",
    leave: "bg-sky-500/15 text-sky-300 border-sky-700",
    weekend: "bg-slate-600/20 text-slate-400 border-slate-700",
    holiday: "bg-violet-500/15 text-violet-300 border-violet-700",
  };
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-800 bg-slate-900 ${className}`}>{children}</div>;
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/60 py-1.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

export function ActionError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-2 rounded-md bg-rose-900/40 px-3 py-2 text-sm text-rose-300">{error}</p>;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mb-4 rounded-md bg-rose-900/40 px-3 py-2 text-sm text-rose-300">{message}</p>;
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
      {children}
    </Link>
  );
}

export function MeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-800 pb-3">
        <NavLink href="/me">My attendance</NavLink>
        <NavLink href="/me/leave">Leave</NavLink>
        <NavLink href="/scan">Scanner</NavLink>
        <span className="flex-1" />
        <a
          href="/api/auth/sign-out"
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Sign out
        </a>
      </nav>
      {children}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-800 pb-3">
        <NavLink href="/admin">Today</NavLink>
        <NavLink href="/admin/employees">Employees</NavLink>
        <NavLink href="/admin/shifts">Shifts</NavLink>
        <NavLink href="/admin/holidays">Holidays</NavLink>
        <NavLink href="/admin/devices">Devices</NavLink>
        <NavLink href="/admin/leaves">Leaves</NavLink>
        <NavLink href="/admin/close">Monthly close</NavLink>
        <NavLink href="/admin/sheet">Monthly sheet</NavLink>
        <span className="flex-1" />
        <NavLink href="/">Home</NavLink>
      </nav>
      {children}
    </div>
  );
}