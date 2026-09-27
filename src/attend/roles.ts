import { collections } from "@/lib/mongo";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { Role } from "./types";

/**
 * Role derives from a single source: the employees staff master, with an
 * ADMIN_EMAIL bootstrap override. No duplicate role state to drift.
 */
export async function roleForEmail(email: string): Promise<Role | null> {
  const canonical = email.trim().toLowerCase();
  const admins = ADMIN_EMAIL.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length && admins.includes(canonical)) return "admin";
  const employee = await collections().employees.findOne({
    email: canonical,
    active: true,
  });
  return employee ? "employee" : null;
}