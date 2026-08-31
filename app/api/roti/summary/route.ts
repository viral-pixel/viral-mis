import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";
import { computeRotiSummary, RotiLineInput } from "@/app/lib/rotiSummary";

// Range aggregate for the Demand Summary view. Two independent optional
// filters — ?siteId= and ?categoryId= — can both be set at once (e.g.
// "Roti at Intas Matoda"). Three different line-filtered views are computed
// so each part of the page answers a different question without the two
// filters stepping on each other:
//   - dailyBreakdown: filtered by BOTH siteId and categoryId — powers the
//     stat cards, trend chart, and day-by-day table (the current selection).
//   - perSite: filtered by categoryId only (never siteId) — so "By Site"
//     stays a cross-site comparison even while one site is selected.
//   - perCategory: filtered by siteId only (never categoryId) — so "By
//     Category" stays a cross-category comparison even while one category
//     is selected.
export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const siteIdParam = req.nextUrl.searchParams.get("siteId");
  const categoryIdParam = req.nextUrl.searchParams.get("categoryId");
  const siteId = siteIdParam ? Number(siteIdParam) : null;
  const categoryId = categoryIdParam ? Number(categoryIdParam) : null;

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
  const byCategoryOnly = categoryId ? allLines.filter((l) => l.categoryId === categoryId) : allLines;
  const bySiteOnly = siteId ? allLines.filter((l) => l.siteId === siteId) : allLines;

  const perSite = computeRotiSummary(sites, mealTypes, categories, byCategoryOnly);
  const perCategory = computeRotiSummary(sites, mealTypes, categories, bySiteOnly);

  const dailyBreakdown = days.map((d) => {
    let lines: RotiLineInput[] = d.lines;
    if (siteId) lines = lines.filter((l) => l.siteId === siteId);
    if (categoryId) lines = lines.filter((l) => l.categoryId === categoryId);
    const daySummary = computeRotiSummary(sites, mealTypes, categories, lines);
    return {
      date: d.date.toISOString().slice(0, 10),
      remarks: d.remarks,
      byCategory: Object.fromEntries(daySummary.perCategory.map((c) => [c.categoryId, c.total])),
      byMeal: daySummary.byMeal,
      total: daySummary.grandTotal,
    };
  });

  return NextResponse.json({
    sites, mealTypes, categories,
    perSite: perSite.perSite,
    perCategory: perCategory.perCategory,
    dailyBreakdown,
    dayCount: days.length,
  });
}
