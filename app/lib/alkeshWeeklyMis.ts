import { prisma } from "@/app/lib/prisma";
import {
  ALKESH_GAS_CATEGORY,
  ALKESH_OIL_CATEGORY,
  ALKESH_PROVISION_ITEMS,
  WEEKLY_MIS_LINES,
  monthRange,
  weekBucketsForMonth,
  weekIndexForDate,
  type WeeklyMisLine,
} from "@/app/lib/alkeshMeta";

export interface WeeklyMisWeekRow {
  label: string;
  values: Record<WeeklyMisLine, number>;
}

export interface WeeklyMisReport {
  monthKey: string;
  weeks: WeeklyMisWeekRow[];
  totals: Record<WeeklyMisLine, number>;
  targets: Record<string, number>;
  variance: Record<string, number>; // total - target, only for lines with a target
}

function emptyLineRecord(): Record<WeeklyMisLine, number> {
  const rec = {} as Record<WeeklyMisLine, number>;
  for (const line of WEEKLY_MIS_LINES) rec[line] = 0;
  return rec;
}

// Consolidates Alkesh's own entries (MRP, Milk/Curd/Buttermilk, Gas,
// Provision) with Kiran's live Roti data and Ketan's live Vegetable data
// into the same weekly grid the source "Weekly MIS" sheet built by hand
// each month — computed fresh every time instead of frozen into pasted
// values, so it never needs the freeze-and-shift ritual the source required.
export async function computeWeeklyMis(monthKey: string): Promise<WeeklyMisReport> {
  const { start, end } = monthRange(monthKey);
  const buckets = weekBucketsForMonth(monthKey);
  const weeks: WeeklyMisWeekRow[] = buckets.map((b) => ({ label: b.label, values: emptyLineRecord() }));
  const totals = emptyLineRecord();

  const add = (date: Date, line: WeeklyMisLine, amount: number) => {
    const idx = weekIndexForDate(date);
    if (weeks[idx]) weeks[idx].values[line] += amount;
    totals[line] += amount;
  };

  const [mrpRows, milkRows, commodityRows, rotiLines, vegRows, potatoOnionRows, cashRows] = await Promise.all([
    prisma.alkeshMrpEntry.findMany({ where: { date: { gte: start, lt: end } }, select: { date: true, amount: true } }),
    prisma.alkeshMilkEntry.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.alkeshCommodityEntry.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.rotiLineItem.findMany({
      where: { dayEntry: { date: { gte: start, lt: end } } },
      select: { quantity: true, dayEntry: { select: { date: true } } },
    }),
    prisma.vegetablePurchaseEntry.findMany({ where: { date: { gte: start, lt: end } }, select: { date: true, amount: true } }),
    prisma.potatoOnionEntry.findMany({ where: { billDate: { gte: start, lt: end } }, select: { billDate: true, amount: true } }),
    prisma.cashPurchaseEntry.findMany({ where: { date: { gte: start, lt: end } }, select: { date: true, amount: true } }),
  ]);

  for (const r of mrpRows) add(r.date, "MRP", r.amount);

  for (const r of milkRows) {
    add(r.date, "Milk", r.milkTeaQty + r.milkPantryQty); // total Ltr received; Tea-only split is exposed separately, see computeMilkEfficiency
    add(r.date, "Curd", r.curdQty);
    add(r.date, "Buttermilk", r.buttermilkQty);
  }

  for (const r of commodityRows) {
    if (r.category === ALKESH_GAS_CATEGORY) add(r.date, "Gas", r.amount);
    else if (r.category === ALKESH_OIL_CATEGORY || (ALKESH_PROVISION_ITEMS as readonly string[]).includes(r.category)) {
      add(r.date, "Provision", r.amount);
    }
  }

  for (const r of rotiLines) add(r.dayEntry.date, "Roti", r.quantity);

  for (const r of vegRows) add(r.date, "Vegetable", r.amount);
  for (const r of potatoOnionRows) if (r.billDate && r.amount) add(r.billDate, "Vegetable", r.amount);
  for (const r of cashRows) add(r.date, "Vegetable", r.amount);

  const targetRows = await prisma.alkeshWeeklyTarget.findMany();
  const targets: Record<string, number> = {};
  const variance: Record<string, number> = {};
  for (const t of targetRows) {
    targets[t.category] = t.monthlyTarget;
    if (t.category in totals) variance[t.category] = totals[t.category as WeeklyMisLine] - t.monthlyTarget;
  }

  return { monthKey, weeks, totals, targets, variance };
}

export interface MilkSiteBreakdown {
  site: string;
  teaQty: number;
  pantryQty: number;
  curdQty: number;
  buttermilkQty: number;
}

// Per-site Tea vs Pantry split for a month — this is the structured
// replacement for what used to be a cell comment the user had to remember to
// apply by hand ("704 Ltr in Pantry @MRP, over and above this") before
// trusting the per-cup tea ratio.
export async function computeMilkSiteBreakdown(monthKey: string): Promise<MilkSiteBreakdown[]> {
  const { start, end } = monthRange(monthKey);
  const rows = await prisma.alkeshMilkEntry.findMany({ where: { date: { gte: start, lt: end } } });
  const bySite = new Map<string, MilkSiteBreakdown>();
  for (const r of rows) {
    const rec = bySite.get(r.site) ?? { site: r.site, teaQty: 0, pantryQty: 0, curdQty: 0, buttermilkQty: 0 };
    rec.teaQty += r.milkTeaQty;
    rec.pantryQty += r.milkPantryQty;
    rec.curdQty += r.curdQty;
    rec.buttermilkQty += r.buttermilkQty;
    bySite.set(r.site, rec);
  }
  return [...bySite.values()].sort((a, b) => b.teaQty - a.teaQty);
}
