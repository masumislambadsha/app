import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongo";
import { addDays, dateKeyInZone, hhmmToMinutes, minutesOfDay, weekdayOf, workingDateForScan, zoneMidnightUtc } from "@/lib/time";
import {
  anchorShiftMinute,
  isOvernightShift,
  resolveDayStatus,
  wrappedEndMin,
  DayOutput,
} from "@/attend/status";
import type { CheckIn, DailyStatusDoc, Employee, LeaveRequest, Shift, ShiftOverride } from "@/attend/types";

/** Effective shift timing for an employee on a date, honouring date-ranged overrides (Ramadan, seasonal hours). */
export async function getEffectiveShift(
  employee: Pick<Employee, "shift_id">,
  date: string,
): Promise<{ shift: Shift | null; override: ShiftOverride | null }> {
  const [shift, override] = await Promise.all([
    collections().shifts.findOne({ _id: employee.shift_id }),
    collections()
      .shiftOverrides.find({ shift_id: employee.shift_id, date_from: { $lte: date }, date_to: { $gte: date } })
      .sort({ date_from: 1 })
      .limit(1)
      .toArray()
      .then((rows) => rows[0] ?? null),
  ]);
  if (!shift) return { shift: null, override: null };
  return { shift, override };
}

const MAX_OVERRIDES = 20;

export async function getApprovedLeaveCovering(
  employeeId: ObjectId,
  date: string,
): Promise<LeaveRequest | null> {
  const reqs = await collections().leaveRequests
    .find({
      employee_id: employeeId,
      status: "approved",
      from: { $lte: date },
      to: { $gte: date },
    })
    .limit(MAX_OVERRIDES)
    .toArray();
  return reqs.find((r) => !r.half_day) ?? null;
}

/**
 * Scans belonging to one working-day for the employee, ascending. A working-day
 * is the Dhaka date whose shift the scans count against — for overnight shifts
 * that spans two calendar days (evening of `date`, morning of `date + 1`).
 */
export async function getWorkingDayScans(
  employeeId: ObjectId,
  date: string,
  startMin: number,
  overnight: boolean,
): Promise<CheckIn[]> {
  // Fetch a 3-calendar-day window and attribute each scan via the shift rules,
  // so stray scans (e.g. a checkout after shift end) still land on the right day.
  const from = zoneMidnightUtc(addDays(date, -1));
  const to = zoneMidnightUtc(addDays(date, 2));
  const scans = await collections()
    .checkIns.find({ employee_id: employeeId, ts: { $gte: from, $lt: to } })
    .sort({ ts: 1 })
    .toArray();
  return scans.filter((s) => workingDateForScan(startMin, overnight, s.ts) === date);
}

export async function getManualStatus(employeeId: ObjectId, date: string): Promise<DailyStatusDoc | null> {
  return collections().dailyStatus.findOne({
    employee_id: employeeId,
    date,
    source: "manual",
  });
}

export interface ComputedDay {
  employeeId: ObjectId;
  date: string;
  output: DayOutput;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  leaveTypeId: string | null;
  lateMin: number;
}

/** Single source of truth: computes an employee's status for one Dhaka date. */
export async function computeDay(employee: Employee, date: string): Promise<ComputedDay> {
  const weekday = weekdayOf(date);
  const holiday = (await collections().holidays.countDocuments({ _id: date })) > 0;
  const [leave, manual, { shift, override }] = await Promise.all([
    getApprovedLeaveCovering(employee._id, date),
    getManualStatus(employee._id, date),
    getEffectiveShift(employee, date),
  ]);

  const startMin = override ? hhmmToMinutes(override.start_time) : shift ? hhmmToMinutes(shift.start_time) : 0;
  const endMin = override ? hhmmToMinutes(override.end_time) : shift ? hhmmToMinutes(shift.end_time) : 0;
  const overnight = shift ? isOvernightShift(startMin, endMin) : false;

  const checkIns = shift ? await getWorkingDayScans(employee._id, date, startMin, overnight) : [];
  const first = checkIns[0];
  const last = checkIns.length >= 2 ? checkIns[checkIns.length - 1] : null;

  const output = resolveDayStatus({
    weekday,
    isHoliday: holiday,
    isWeeklyOff: employee.weekly_off.includes(weekday),
    isApprovedLeave: !!leave,
    checkInMin: first ? anchorShiftMinute(startMin, overnight, minutesOfDay(first.ts)) : null,
    checkOutMin: last ? anchorShiftMinute(startMin, overnight, minutesOfDay(last.ts)) : null,
    shift: shift
      ? {
          startMin,
          endMin: wrappedEndMin(startMin, endMin),
          graceMin: shift.grace_min,
          halfDayAfterMin: shift.half_day_after_min,
          earlyExitMin: shift.early_exit_min,
        }
      : null,
    manualStatus: manual?.status ?? null,
  });

  return {
    employeeId: employee._id,
    date,
    output,
    checkInAt: first?.ts ?? null,
    checkOutAt: last?.ts ?? null,
    leaveTypeId: leave?.type_id ?? null,
    lateMin: output.lateMin,
  };
}

/** Upsert one day's daily_status row (idempotent on employer+date). Manual rows are never overwritten by the auto job. */
export async function materializeDay(computed: ComputedDay): Promise<void> {
  if (await getManualStatus(computed.employeeId, computed.date)) return;
  const { employeeId, date, output, lateMin } = computed;
  await collections().dailyStatus.updateOne(
    { employee_id: employeeId, date },
    {
      $set: {
        status: output.status,
        late_min: lateMin,
        source: "auto",
        leave_type_id: computed.leaveTypeId ?? null,
        check_in_at: computed.checkInAt,
        check_out_at: computed.checkOutAt,
        flag: output.flag,
        updated_at: new Date(),
      },
      $setOnInsert: { _id: new ObjectId() },
    },
    { upsert: true },
  );
}

export async function lastMaterializedDate(): Promise<string | null> {
  const doc = await collections().dailyStatus
    .find({ source: "auto" })
    .sort({ date: -1 })
    .limit(1)
    .toArray();
  return doc[0]?.date ?? null;
}

export function nowDateKey(): string {
  return dateKeyInZone(new Date());
}