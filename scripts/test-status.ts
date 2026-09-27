// Runs with: node scripts/test-status.ts (Node 20.11+ type stripping)
// Covers §15 acceptance tests #1/#2/#3 logic at the pure-function level.
import {
  anchorShiftMinute,
  isOvernightShift,
  resolveDayStatus,
  wrappedEndMin,
} from "../src/attend/status.ts";

// Shift 9:00-18:00, grace 10, half-day threshold 60, early-exit 60 (before 17:00)
const shift = { startMin: 9 * 60, endMin: 18 * 60, graceMin: 10, halfDayAfterMin: 60, earlyExitMin: 60 };

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.error(`FAIL ${name}\n     got  ${g}\n     want ${w}`);
  }
}

console.log("§15 #1 — status engine boundaries");
eq("present at 9:00", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 18 * 60, shift }).status, "present");
eq("present at grace (9:10)", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60 + 10, checkOutMin: 18 * 60, shift }).status, "present");
eq("late at grace+1 (9:11)", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60 + 11, checkOutMin: 18 * 60, shift }).status, "late");
eq("late at 9:59", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60 + 59, checkOutMin: 18 * 60, shift }).status, "late");
eq("late_min = 59", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60 + 59, checkOutMin: 18 * 60, shift }).lateMin, 59);
eq("half-day at threshold+1 (10:01)", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60 + 61, checkOutMin: 18 * 60, shift }).status, "half_day");
eq("absent when no scan", resolveDayStatus({ weekday: 0, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: null, checkOutMin: null, shift }).status, "absent");

console.log("§5 — priority (holiday > weekend > leave > absence)");
eq("holiday beats weekend", resolveDayStatus({ weekday: 5, isHoliday: true, isWeeklyOff: true, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: null, shift }).status, "holiday");
eq("weekend beats leave", resolveDayStatus({ weekday: 5, isHoliday: false, isWeeklyOff: true, isApprovedLeave: true, checkInMin: null, checkOutMin: null, shift }).status, "weekend");
eq("leave beats absence", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: true, checkInMin: null, checkOutMin: null, shift }).status, "leave");
eq("scan on holiday keeps holiday", resolveDayStatus({ weekday: 1, isHoliday: true, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 18 * 60, shift }).status, "holiday");
eq("scan on weekend keeps weekend", resolveDayStatus({ weekday: 5, isHoliday: false, isWeeklyOff: true, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 18 * 60, shift }).status, "weekend");

console.log("§4 — check-out flags");
eq("early-exit flagged before end-60", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 17 * 60 - 1, shift }).flag, "early_exit");
eq("normal checkout no flag", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 17 * 60, shift }).flag, null);
eq("missing checkout flagged", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: null, shift }).flag, "missing_checkout");

console.log("§5 — override behaviour with shift override (Ramadan 9:00-15:00)");
const ramadanShift = { ...shift, endMin: 15 * 60 };
eq("early exit vs 15:00 end not flagged at 14:30", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 14 * 60 + 30, shift: ramadanShift }).flag, null);
eq("manual override wins", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 9 * 60, checkOutMin: 18 * 60, shift, manualStatus: "absent" }).status, "absent");

console.log("§5 — night shift (22:00->06:00) helpers + status");
eq("22:00->06:00 detected as overnight", isOvernightShift(22 * 60, 6 * 60), true);
eq("09:00->18:00 not overnight", isOvernightShift(9 * 60, 18 * 60), false);
eq("wrapped end = 1800", wrappedEndMin(22 * 60, 6 * 60), 6 * 60 + 24 * 60);
eq("next-morning 06:05 anchors to 1805", anchorShiftMinute(22 * 60, true, 6 * 60 + 5), 6 * 60 + 24 * 60 + 5);
eq("same-evening 22:05 anchors to 1325", anchorShiftMinute(22 * 60, true, 22 * 60 + 5), 22 * 60 + 5);
const nightShift = { startMin: 22 * 60, endMin: 6 * 60 + 24 * 60, graceMin: 10, halfDayAfterMin: 60, earlyExitMin: 60 };
eq("night on-time in+out present", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 22 * 60, checkOutMin: 6 * 60 + 24 * 60, shift: nightShift }).status, "present");
eq("night on-time checkout no flag", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 22 * 60, checkOutMin: 6 * 60 + 24 * 60, shift: nightShift }).flag, null);
eq("night late after grace (22:30)", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 22 * 60 + 30, checkOutMin: 6 * 60 + 24 * 60, shift: nightShift }).status, "late");
eq("night early-exit at 04:30", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 22 * 60, checkOutMin: 4 * 60 + 30 + 24 * 60, shift: nightShift }).flag, "early_exit");
eq("night missing checkout when no scan out", resolveDayStatus({ weekday: 1, isHoliday: false, isWeeklyOff: false, isApprovedLeave: false, checkInMin: 22 * 60, checkOutMin: null, shift: nightShift }).flag, "missing_checkout");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);