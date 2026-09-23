import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { computeMilkSiteBreakdown } from "@/app/lib/alkeshWeeklyMis";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const monthKey = req.nextUrl.searchParams.get("month");
  if (!monthKey) return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });

  const rows = await computeMilkSiteBreakdown(monthKey);
  return NextResponse.json(rows);
}
