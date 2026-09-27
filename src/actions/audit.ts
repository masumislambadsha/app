import { collections } from "@/lib/mongo";

export interface AuditEntry {
  actor: string; // user email
  action: string; // e.g. "employee.update", "checkin.correct", "month.close"
  entity: string; // e.g. "employees:<id>", "daily_status:<emp>:<date>"
  old?: unknown;
  new?: unknown;
  reason?: string;
}

/**
 * Every manual change writes an append-only audit row. Immutability is
 * additionally enforced at the database layer (see scripts/setup-app-user.mjs
 * and README): the app DB user only has insert+find on this collection.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  await collections().auditLog.insertOne({
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    old: entry.old ?? null,
    new: entry.new ?? null,
    reason: entry.reason,
    ts: new Date(),
  });
}