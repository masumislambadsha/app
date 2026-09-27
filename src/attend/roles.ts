import { collections } from "@/lib/mongo";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { Role } from "./types";

/**
 * Role derives from a single source: the employees staff master, with an
 * ADMIN_EMAIL bootstrap override. No duplicate role state to drift.
 */
export async function roleForEmail(email: string): Promise<Role | null> {
  const canonical = email.trim().toLowerCase();
  if (ADMIN_EMAIL && canonical === ADMIN_EMAIL.trim().toLowerCase()) return "admin";
  const employee = await collections().employees.findOne({
    email: canonical,
    active: true,
  });
  return employee ? "employee" : null;
}