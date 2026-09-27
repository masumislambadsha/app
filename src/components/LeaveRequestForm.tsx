"use client";

import { useActionState } from "react";
import { requestLeaveState, type LeaveActionResult } from "@/actions/leave";
import { ActionError } from "@/components/ui";

export interface LeaveTypeOption {
  id: string;
  name: string;
  paid: boolean;
  balance: number;
}

export function LeaveRequestForm({ types, today }: { types: LeaveTypeOption[]; today: string }) {
  const [state, action, pending] = useActionState<LeaveActionResult, FormData>(requestLeaveState, { ok: true });

  return (
    <div>
      {state.ok && state.message && (
        <p className="rounded-md bg-emerald-900/40 px-3 py-2 text-sm text-emerald-300">{state.message}</p>
      )}
      <ActionError error={state.ok ? null : (state.error ?? "request failed")} />
      <form action={action} className="mt-2 grid gap-3 sm:grid-cols-2">
        <select name="type_id" required className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          <option value="" disabled>
            Leave type…
          </option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.balance.toFixed(t.balance % 1 === 0 ? 0 : 1)} left {t.paid ? "" : "(unpaid)"}
            </option>
          ))}
        </select>
        <input name="from" type="date" min={today} required className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <input name="to" type="date" min={today} required className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="half_day" className="accent-sky-500" />
          Half day
        </label>
        <input name="reason" placeholder="Reason (optional)" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
        <button
          disabled={pending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50 sm:col-span-2"
        >
          {pending ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}