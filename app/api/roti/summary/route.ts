import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";
import { computeRotiSummary } from "@/app/lib/rotiSummary";

// Range aggregate for the Demand Summary view: site-wise and category-wise
// totals across every day in range, plus a per-day grand-total trend so
// spikes/dips in demand are easy to spot at a glance.
export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [sites, mealTypes, categories, days] = await Promise.all([
    prisma.rotiSite.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.rotiMealType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.rotiCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.rotiDayEntry.findMany({ where, include: { lines: true }, orderBy: { date: "asc" } }),
  ]);

  const allLines = days.flatMap((d) => d.lines);
  const summary = computeRotiSummary(sites, mealTypes, categories, allLines);

  const trend = days.map((d) => ({
    date: d.date.toISOString().slice(0, 10),
    total: d.lines.reduce((s, l) => s + l.quantity, 0),
  }));

  return NextResponse.json({ mealTypes, summary, trend, dayCount: days.length });
}
