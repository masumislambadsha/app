import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongo";
import { rangeKeys, weekdayOf } from "@/lib/time";
import { writeAudit } from "@/actions/audit";
import type { Employee, LeaveBalance, LeaveRequest } from "@/attend/types";

export interface LeaveResult {
  ok: boolean;
  error?: string;
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export async function getLeaveType(typeId: string) {
  return collections().leaveTypes.findOne({ _id: typeId });
}

export async function getAllLeaveTypes() {
  return collections().leaveTypes.find({}).toArray();
}

async function ensureBalance(employeeId: ObjectId, typeId: string, year: number): Promise<LeaveBalance> {
  const existing = await collections().leaveBalances.findOne({ employee_id: employeeId, type_id: typeId, year });
  if (existing) return existing as LeaveBalance;
  const type = await getLeaveType(typeId);
  await collections().leaveBalances
    .insertOne({
      _id: new ObjectId(),
      employee_id: employeeId,
      type_id: typeId,
      year,
      quota: type?.annual_quota ?? 0,
      used: 0,
      accrual_progress: 0,
    })
    .catch(() => undefined); // concurrent insert
  return (await collections().leaveBalances.findOne({ employee_id: employeeId, type_id: typeId, year })) as LeaveBalance;
}

/** Days in [from,to] that are actual workdays for the employee (not weekly-off, not holiday). */
export async function countWorkdaysInRange(emp: Pick<Employee, "_id" | "weekly_off">, from: string, to: string): Promise<number> {
  const holidays = new Set(
    (await collections().holidays.find({ _id: { $in: rangeKeys(from, to) } }).project({ _id: 1 }).toArray()).map(
      (h) => String(h._id),
    ),
  );
  return rangeKeys(from, to).filter((d) => !emp.weekly_off.includes(weekdayOf(d)) && !holidays.has(d)).length;
}

export async function requestedDaysFor(req: {
  employee: Pick<Employee, "_id" | "weekly_off">;
  typeId: string;
  from: string;
  to: string;
  halfDay: boolean;
}): Promise<{ days: number; error?: string }> {
  if (req.from > req.to) return { days: 0, error: "start date is after end date" };
  if (req.halfDay && req.from !== req.to) return { days: 0, error: "half-day leave applies to a single date" };
  const workdays = await countWorkdaysInRange(req.employee, req.from, req.to);
  if (workdays === 0 && req.from !== req.to) return { days: 0, error: "no working days in that range" };
  return { days: req.halfDay ? 0.5 : workdays };
}

export async function availableBalance(employeeId: ObjectId, typeId: string, year: number): Promise<number> {
  const b = await ensureBalance(employeeId, typeId, year);
  return b.quota - b.used;
}

export async function submitLeave(params: {
  employeeId: ObjectId;
  typeId: string;
  from: string;
  to: string;
  halfDay: boolean;
  reason: string;
}): Promise<LeaveResult & { id?: string }> {
  const employee = await collections().employees.findOne({ _id: params.employeeId });
  if (!employee) return { ok: false, error: "employee not found" };
  const { days, error } = await requestedDaysFor({ ...params, employee });
  if (error) return { ok: false, error };

  const type = await getLeaveType(params.typeId);
  const year = yearOf(params.from);

  // Earned leave requests need an existing balance; others are ensured on submit so
  // the employee can see where they stand before asking.
  if (!type?.earned_accrual) {
    const available = await availableBalance(params.employeeId, params.typeId, year);
    if (available < days) {
      return { ok: false, error: `insufficient balance (${available} remaining, ${days} requested)` };
    }
  }

  const inserted = await collections().leaveRequests.insertOne({
    _id: new ObjectId(),
    employee_id: params.employeeId,
    type_id: params.typeId,
    from: params.from,
    to: params.to,
    half_day: params.halfDay,
    reason: params.reason,
    status: "pending",
    requested_days: days,
    created_at: new Date(),
  });
  return { ok: true, id: inserted.insertedId.toString() };
}

export async function setLeaveStatus(
  requestId: ObjectId,
  toStatus: LeaveRequest["status"],
  actor: string,
): Promise<LeaveResult> {
  const current = await collections().leaveRequests.findOne({ _id: requestId });
  if (!current) return { ok: false, error: "request not found" };
  if (current.status === toStatus) return { ok: false, error: "already in that state" };
  if (current.status === "rejected") return { ok: false, error: "rejected requests cannot change" };

  const balance = await ensureBalance(current.employee_id, current.type_id, yearOf(current.from));
  const type = await getLeaveType(current.type_id);

  if (toStatus === "approved") {
    if (current.status !== "pending") return { ok: false, error: "only pending requests can be approved" };
    if (current.requested_days > balance.quota - balance.used) {
      return { ok: false, error: "insufficient remaining balance to approve" };
    }
    await collections().leaveRequests.updateOne(
      { _id: requestId, status: "pending" },
      { $set: { status: "approved", reviewed_by: actor, reviewed_at: new Date() } },
    );
    await collections().leaveBalances.updateOne({ _id: balance._id }, { $inc: { used: current.requested_days } });
  } else if (toStatus === "cancelled") {
    if (current.status === "approved") {
      await collections().leaveBalances.updateOne({ _id: balance._id }, { $inc: { used: -current.requested_days } });
    }
    await collections().leaveRequests.updateOne(
      { _id: requestId },
      { $set: { status: "cancelled", reviewed_by: actor, reviewed_at: new Date() } },
    );
  } else {
    await collections().leaveRequests.updateOne(
      { _id: requestId, status: "pending" },
      { $set: { status: "rejected", reviewed_by: actor, reviewed_at: new Date() } },
    );
  }

  await writeAudit({
    actor,
    action: `leave.${toStatus}`,
    entity: `leave_requests:${requestId}`,
    old: { status: current.status, type: current.type_id, from: current.from, to: current.to, days: current.requested_days },
    new: { status: toStatus },
    reason: type ? `${type.name} requested ${current.requested_days} day(s)` : undefined,
  });
  return { ok: true };
}

/**
 * Earned-leave accrual for a month: days with status present/late count 1,
 * half-day counts 0.5 toward accrual_progress; every 18 worked days converts
 * to 1 earned leave day; the remainder carries forward. Runs at monthly close.
 */
export async function applyEarnedAccrual(month: string, actor: string): Promise<{ credited: number }> {
  const year = Number(month.slice(0, 4));
  const employees = await collections().employees.find({ active: true }).toArray();
  let credited = 0;
  for (const emp of employees) {
    const stats = await collections().dailyStatus
      .find({ employee_id: emp._id, date: { $regex: `^${month}-` } })
      .toArray();
    let worked = 0;
    for (const s of stats) {
      if (s.status === "present" || s.status === "late") worked += 1;
      else if (s.status === "half_day") worked += 0.5;
    }
    if (worked === 0) continue;
    const balance = await ensureBalance(emp._id, "earned", year);
    const progress = balance.accrual_progress + worked;
    const gained = Math.floor(progress / 18);
    if (gained > 0) {
      credited += gained;
      await collections().leaveBalances.updateOne(
        { _id: balance._id },
        { $set: { quota: balance.quota + gained, accrual_progress: progress % 18 } },
      );
    } else {
      await collections().leaveBalances.updateOne({ _id: balance._id }, { $set: { accrual_progress: progress } });
    }
  }
  if (credited > 0) {
    await writeAudit({ actor, action: "leave.accrual", entity: `leave_balances:earned:${year}`, new: { month, earned_days_credited: credited } });
  }
  return { credited };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}