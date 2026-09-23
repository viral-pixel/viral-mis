import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";
import { monthKeyOf, monthRange } from "@/app/lib/alkeshMeta";

// Replaces the source "MRP MIS" sheet's PivotTable (Category filter, Month
// filter) with a live equivalent — by-category, by-site and by-vendor
// breakdowns for a month, plus a month-over-month trend so the whole
// history doesn't need to be re-pivoted by hand.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const monthKey = req.nextUrl.searchParams.get("month");
  const category = req.nextUrl.searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (monthKey) {
    const { start, end } = monthRange(monthKey);
    where.date = { gte: start, lt: end };
  }
  if (category) where.category = category;

  const rows = await prisma.alkeshMrpEntry.findMany({ where, orderBy: { date: "desc" } });

  const byCategory = new Map<string, number>();
  const bySite = new Map<string, number>();
  const byVendor = new Map<string, number>();
  for (const r of rows) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
    bySite.set(r.site, (bySite.get(r.site) ?? 0) + r.amount);
    byVendor.set(r.vendorName, (byVendor.get(r.vendorName) ?? 0) + r.amount);
  }

  // Trend uses ALL months (ignores the month filter, still respects category)
  const trendWhere: Record<string, unknown> = category ? { category } : {};
  const allRows = await prisma.alkeshMrpEntry.findMany({ where: trendWhere, select: { date: true, amount: true } });
  const byMonth = new Map<string, number>();
  for (const r of allRows) {
    const key = monthKeyOf(r.date);
    byMonth.set(key, (byMonth.get(key) ?? 0) + r.amount);
  }

  const toSortedRows = (m: Map<string, number>) =>
    [...m.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    total: rows.reduce((s, r) => s + r.amount, 0),
    count: rows.length,
    byCategory: toSortedRows(byCategory),
    bySite: toSortedRows(bySite),
    byVendor: toSortedRows(byVendor),
    trend: [...byMonth.entries()].map(([monthKey, amount]) => ({ monthKey, amount })).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
  });
}
