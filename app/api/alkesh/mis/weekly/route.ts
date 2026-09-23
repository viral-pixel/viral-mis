import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { computeWeeklyMis } from "@/app/lib/alkeshWeeklyMis";

// Admin-only: the consolidated analysis view is not part of Alkesh's own
// module access, per the user's explicit instruction (2026-09-23) that
// visibility of anything analytical built from his data stays with them.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const monthKey = req.nextUrl.searchParams.get("month");
  if (!monthKey) return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });

  const report = await computeWeeklyMis(monthKey);
  return NextResponse.json(report);
}
