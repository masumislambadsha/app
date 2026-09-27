import { NextResponse } from "next/server";
import { requireAdmin } from "@/auth";
import { monthlySheet, rowsToCsv, rowsToJsonv1 } from "@/attend/payroll";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireAdmin();
  void session;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? currentMonth();
  const format = searchParams.get("format") ?? "csv";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "bad month" }, { status: 400 });
  }
  const sheet = await monthlySheet(month);
  if (format === "json") {
    return NextResponse.json(rowsToJsonv1(sheet), {
      headers: { "Content-Disposition": `attachment; filename="attendance-${month}.json"` },
    });
  }
  return new NextResponse(rowsToCsv(sheet), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${month}.csv"`,
    },
  });
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}