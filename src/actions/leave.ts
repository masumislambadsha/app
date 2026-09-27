"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongo";
import { requireAdmin, requireEmployee } from "@/auth";
import { submitLeave, setLeaveStatus } from "@/attend/leave";

export type LeaveActionResult = { ok: boolean; error?: string; message?: string };

function fail(path: string, msg: string): never {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

async function employeeIdForEmail(email: string) {
  const emp = await collections().employees.findOne({ email: email.toLowerCase(), active: true });
  return emp?._id ?? null;
}

export async function requestLeave(formData: FormData): Promise<LeaveActionResult> {
  const user = await requireEmployee();
  const employeeId = await employeeIdForEmail(user.email);
  if (!employeeId) return { ok: false, error: "no active employee record" };

  const res = await submitLeave({
    employeeId,
    typeId: String(formData.get("type_id") ?? ""),
    from: String(formData.get("from") ?? ""),
    to: String(formData.get("to") ?? ""),
    halfDay: formData.get("half_day") === "on",
    reason: String(formData.get("reason") ?? "").trim(),
  });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/me");
  return { ok: true, message: "Leave request submitted" };
}

export async function requestLeaveState(
  _prev: LeaveActionResult,
  formData: FormData,
): Promise<LeaveActionResult> {
  return requestLeave(formData);
}

export async function cancelMyLeave(formData: FormData): Promise<void> {
  const user = await requireEmployee();
  const id = String(formData.get("id") ?? "");
  const req = await collections().leaveRequests.findOne({ _id: new ObjectId(id) });
  if (!req) return fail("/me/leave", "not found");
  if (req.employee_id.toString() !== (await employeeIdForEmail(user.email))?.toString()) {
    return fail("/me/leave", "not your request");
  }
  const res = await setLeaveStatus(req._id, "cancelled", user.email);
  if (!res.ok) return fail("/me/leave", res.error ?? "cancel failed");
  revalidatePath("/me");
  revalidatePath("/me/leave");
}

export async function decideLeave(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as "approved" | "rejected";
  const res = await setLeaveStatus(new ObjectId(id), action, admin.email);
  if (!res.ok) return fail("/admin/leaves", res.error ?? "decision failed");
  revalidatePath("/admin/leaves");
}