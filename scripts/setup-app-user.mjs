// Create/verify the app DB user with a locked-down audit_log role.
// audit_log is append-only at the DB level: the app user can insert + find on it,
// but cannot update, delete, or drop the collection.
//
// Requirements:
//   MONGODB_ADMIN_URI  — URI of an Atlas user with dbAdminUser/admin privileges
//   MONGODB_APP_USER   — app user name (default: attendance_app)
//   MONGODB_APP_PASS   — app user password (default: generate random)
//
// Usage: node scripts/setup-app-user.mjs
// In Atlas you can also do this manually: Database Access -> Add New User ->
//   Privileges: custom role granting
//     'find' + 'insert' on attendance.audit_log
//     'readWrite' on attendance.*  (and your admin DB for other mongo-admin ops)
import { MongoClient } from "mongodb";
import crypto from "node:crypto";

const adminUri = process.env.MONGODB_ADMIN_URI;
if (!adminUri) {
  console.error("MONGODB_ADMIN_URI is required (privileged/owner credentials)");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "attendance";
const appUser = process.env.MONGODB_APP_USER || "attendance_app";
const appPass = process.env.MONGODB_APP_PASS || crypto.randomBytes(18).toString("base64url");

const roles = [
  // audit_log: insert + find only. No update/deleteAsAny/collection admin.
  { role: "customReadWriteLockedAudit", db: dbName },
  // everything else: readWrite (employees, check_ins, payroll, ...)
  { role: "readWrite", db: dbName },
];

const auditRole = {
  role: "customReadWriteLockedAudit",
  db: dbName,
  privileges: [
    { resource: { db: dbName, collection: "audit_log" }, actions: ["find", "insert"] },
  ],
  roles: [],
};

const client = new MongoClient(adminUri, { appName: "attendance-acl-setup" });

await client.connect();
try {
  const admin = client.db("admin");
  // Ensure the custom role exists (idempotent).
  await admin.command({
    createRole: auditRole.role,
    privileges: auditRole.privileges,
    roles: auditRole.roles,
  }).catch((e) => {
    if (String(e?.code ?? "").includes("RoleAlreadyExists") || e?.errmsg?.includes("already exists")) {
      // re-apply so privileges stay locked-down even if previously misconfigured
      return admin.command({ updateRole: auditRole.role, privileges: auditRole.privileges, roles: auditRole.roles });
    }
    throw e;
  });

  await admin.command({
    createUser: appUser,
    pwd: appPass,
    roles,
  }).catch((e) => {
    if (String(e?.code ?? "").includes("UserAlreadyExists") || e?.errmsg?.includes("already exists")) {
      return admin.command({ updateUser: appUser, pwd: appPass, roles });
    }
    throw e;
  });

  console.log(`app user '${appUser}' ready. AUDIT_LOG is insert+find only.`);
  console.log(`Set in .env.local:\nMONGODB_URI=mongodb+srv://${appUser}:<password>@.../?authSource=admin`);
  if (!process.env.MONGODB_APP_PASS) {
    console.warn(`Generated password (save it now): ${appPass}`);
  }
} finally {
  await client.close();
}