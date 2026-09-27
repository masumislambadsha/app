/**
 * Daily status resolver — the single source of truth for a day's status.
 * Pure, testable module (no imports). All times are minutes since Asia/Dhaka
 * midnight; weekday uses JS convention (0=Sun..6=Sat; BD: 0=Sun, 5=Fri).
 *
 * Resolution priority (strict): manual override > holiday > weekly off >
 * approved leave > missing check-in (absent) > timing (present/late/half-day).
 */

export type DayStatus =
  | "present"
  | "late"
  | "half_day"
  | "absent"
  | "leave"
  | "weekend"
  | "holiday";

export type OversightFlag = "early_exit" | "missing_checkout" | null;

export interface ShiftTiming {
  startMin: number;
  endMin: number;
  graceMin: number;
  halfDayAfterMin: number;
  earlyExitMin: number;
}

export interface DayInput {
  weekday: number; // 0=Sun..6=Sat
  isHoliday: boolean;
  isWeeklyOff: boolean;
  isApprovedLeave: boolean;
  checkInMin: number | null; // first scan today
  checkOutMin: number | null; // last scan today (if any)
  shift: ShiftTiming | null;
  manualStatus?: DayStatus | null;
}

export interface DayOutput {
  status: DayStatus;
  lateMin: number;
  flag: OversightFlag;
}

export function resolveDayStatus(input: DayInput): DayOutput {
  if (input.manualStatus) {
    return { status: input.manualStatus, lateMin: 0, flag: null };
  }
  if (input.isHoliday) return { status: "holiday", lateMin: 0, flag: null };
  if (input.isWeeklyOff) return { status: "weekend", lateMin: 0, flag: null };
  if (input.isApprovedLeave) return { status: "leave", lateMin: 0, flag: null };

  if (input.checkInMin === null) {
    return { status: "absent", lateMin: 0, flag: null };
  }

  if (!input.shift) {
    return { status: "absent", lateMin: 0, flag: null };
  }

  const diff = input.checkInMin - input.shift.startMin;
  let status: DayStatus;
  let lateMin = 0;
  if (diff <= input.shift.graceMin) {
    status = "present";
  } else if (diff <= input.shift.halfDayAfterMin) {
    status = "late";
    lateMin = diff;
  } else {
    status = "half_day";
    lateMin = diff;
  }

  let flag: OversightFlag = null;
  if (input.checkOutMin !== null) {
    if (input.checkOutMin < input.shift.endMin - input.shift.earlyExitMin) {
      flag = "early_exit";
    }
  } else {
    flag = "missing_checkout";
  }

  return { status, lateMin, flag };
}
