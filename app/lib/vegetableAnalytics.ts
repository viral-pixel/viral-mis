import { prisma } from "@/app/lib/prisma";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthKeyOf(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function monthLabelOf(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}
function pctChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export type OverviewCategory =
  | { kind: "main" }
  | { kind: "produce"; item: string }
  | { kind: "cash"; category: string };

export interface MonthlyOverviewRow {
  monthKey: string;
  monthLabel: string;
  totalQty: number | null;
  totalAmount: number;
  avgRate: number | null;
  qtyChangePct: number | null;
  amountChangePct: number | null;
  rateChangePct: number | null;
}

interface DateRange {
  from?: string; // "YYYY-MM"
  to?: string;
}

function monthRangeWhere(range?: DateRange) {
  if (!range?.from && !range?.to) return {};
  return {
    gte: range?.from ? new Date(`${range.from}-01`) : undefined,
    lte: range?.to ? new Date(new Date(`${range.to}-01`).getFullYear(), new Date(`${range.to}-01`).getMonth() + 1, 0) : undefined,
  };
}

function buildOverviewRows(monthTotals: Map<string, { qty: number | null; amount: number }>): MonthlyOverviewRow[] {
  const sortedKeys = [...monthTotals.keys()].sort();
  const rows: MonthlyOverviewRow[] = [];
  let prevQty: number | null = null;
  let prevAmount: number | null = null;
  let prevRate: number | null = null;
  for (const key of sortedKeys) {
    const t = monthTotals.get(key)!;
    const avgRate = t.qty && t.qty !== 0 ? Math.round((t.amount / t.qty) * 100) / 100 : null;
    rows.push({
      monthKey: key,
      monthLabel: monthLabelOf(key),
      totalQty: t.qty != null ? Math.round(t.qty * 100) / 100 : null,
      totalAmount: Math.round(t.amount),
      avgRate,
      qtyChangePct: pctChange(t.qty, prevQty),
      amountChangePct: pctChange(t.amount, prevAmount),
      rateChangePct: pctChange(avgRate, prevRate),
    });
    prevQty = t.qty;
    prevAmount = t.amount;
    prevRate = avgRate;
  }
  return rows;
}

export async function collectMonthlyOverview(category: OverviewCategory, range?: DateRange): Promise<MonthlyOverviewRow[]> {
  const monthTotals = new Map<string, { qty: number | null; amount: number }>();

  if (category.kind === "main") {
    const entries = await prisma.vegetablePurchaseEntry.findMany({ where: { date: monthRangeWhere(range) } });
    for (const e of entries) {
      const key = monthKeyOf(e.date);
      const existing = monthTotals.get(key) ?? { qty: 0, amount: 0 };
      existing.qty = (existing.qty ?? 0) + e.quantity;
      existing.amount += e.amount;
      monthTotals.set(key, existing);
    }
  } else if (category.kind === "produce") {
    const entries = await prisma.potatoOnionEntry.findMany({
      where: { item: category.item, billDate: monthRangeWhere(range) },
    });
    for (const e of entries) {
      if (!e.billDate) continue;
      const key = monthKeyOf(e.billDate);
      const existing = monthTotals.get(key) ?? { qty: 0, amount: 0 };
      if (e.quantity != null) existing.qty = (existing.qty ?? 0) + e.quantity;
      existing.amount += e.amount ?? 0;
      monthTotals.set(key, existing);
    }
  } else {
    const entries = await prisma.cashPurchaseEntry.findMany({
      where: { category: category.category, date: monthRangeWhere(range) },
    });
    for (const e of entries) {
      const key = monthKeyOf(e.date);
      const existing = monthTotals.get(key) ?? { qty: null, amount: 0 };
      existing.amount += e.amount;
      monthTotals.set(key, existing);
    }
  }

  return buildOverviewRows(monthTotals);
}

// Grand total across every category (main vegetables + every distinct
// Potato/Onion item + every cash category) — "how much did we spend on
// produce overall this month," the top-level figure the user cares about
// alongside the per-category breakdowns.
export async function collectCombinedMonthlyTotal(range?: DateRange): Promise<{ monthKey: string; monthLabel: string; totalAmount: number; amountChangePct: number | null }[]> {
  const monthTotals = new Map<string, number>();

  const [veg, produce, cash] = await Promise.all([
    prisma.vegetablePurchaseEntry.findMany({ where: { date: monthRangeWhere(range) } }),
    prisma.potatoOnionEntry.findMany({ where: { billDate: monthRangeWhere(range) } }),
    prisma.cashPurchaseEntry.findMany({ where: { date: monthRangeWhere(range) } }),
  ]);

  for (const e of veg) {
    const key = monthKeyOf(e.date);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + e.amount);
  }
  for (const e of produce) {
    if (!e.billDate) continue;
    const key = monthKeyOf(e.billDate);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + (e.amount ?? 0));
  }
  for (const e of cash) {
    const key = monthKeyOf(e.date);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + e.amount);
  }

  const sortedKeys = [...monthTotals.keys()].sort();
  let prev: number | null = null;
  return sortedKeys.map((key) => {
    const totalAmount = Math.round(monthTotals.get(key)!);
    const row = { monthKey: key, monthLabel: monthLabelOf(key), totalAmount, amountChangePct: pctChange(totalAmount, prev) };
    prev = totalAmount;
    return row;
  });
}

export interface VendorComparisonRow {
  itemId: number;
  itemName: string;
  srNo: number;
  vendorId: number;
  vendorName: string;
  totalQty: number;
  totalAmount: number;
  avgRate: number;
}

// Item-wise weighted-average rate per vendor for one month — the vendor
// comparison the user asked for. Weighted (Amount / Qty) rather than a
// simple mean of daily rates, per the user's confirmed choice.
export async function collectVendorComparison(month: string): Promise<VendorComparisonRow[]> {
  const from = new Date(`${month}-01`);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);

  const entries = await prisma.vegetablePurchaseEntry.findMany({
    where: { date: { gte: from, lte: to } },
    include: { item: true, vendor: true },
  });

  const key = (itemId: number, vendorId: number) => `${itemId}-${vendorId}`;
  const totals = new Map<string, VendorComparisonRow>();
  for (const e of entries) {
    const k = key(e.itemId, e.vendorId);
    const existing = totals.get(k) ?? {
      itemId: e.itemId, itemName: e.item.name, srNo: e.item.srNo,
      vendorId: e.vendorId, vendorName: e.vendor.name,
      totalQty: 0, totalAmount: 0, avgRate: 0,
    };
    existing.totalQty += e.quantity;
    existing.totalAmount += e.amount;
    totals.set(k, existing);
  }

  return [...totals.values()]
    .map((r) => ({ ...r, totalQty: Math.round(r.totalQty * 100) / 100, totalAmount: Math.round(r.totalAmount), avgRate: Math.round((r.totalAmount / r.totalQty) * 100) / 100 }))
    .sort((a, b) => a.srNo - b.srNo || b.totalAmount - a.totalAmount);
}

export interface ItemTrendPoint {
  date: string;
  vendorName: string;
  quantity: number;
  rate: number;
  amount: number;
}

export async function collectItemTrend(itemId: number, range?: DateRange): Promise<ItemTrendPoint[]> {
  const entries = await prisma.vegetablePurchaseEntry.findMany({
    where: { itemId, date: monthRangeWhere(range) },
    include: { vendor: true },
    orderBy: { date: "asc" },
  });
  return entries.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    vendorName: e.vendor.name,
    quantity: e.quantity,
    rate: e.rate,
    amount: Math.round(e.amount),
  }));
}

export interface DailyVendorRow {
  date: string; // "YYYY-MM-DD"
  totalQty: number;
  totalAmount: number;
  byVendor: Record<number, { qty: number; amount: number }>;
}

// Day-by-day, vendor-by-vendor pivot for Ketan's "what did I enter on which
// day, from which vendor" view. Day-precision from/to (unlike every other
// function in this file, which works in month-precision) — only dates with
// at least one purchase are returned, so a long range doesn't render a wall
// of empty rows.
export async function collectDailyVendorEntries(range: { from: string; to: string }): Promise<DailyVendorRow[]> {
  const entries = await prisma.vegetablePurchaseEntry.findMany({
    where: {
      date: {
        gte: new Date(`${range.from}T00:00:00.000Z`),
        lt: new Date(new Date(`${range.to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000),
      },
    },
    select: { date: true, vendorId: true, quantity: true, amount: true },
  });

  const byDate = new Map<string, DailyVendorRow>();
  for (const e of entries) {
    const dateKey = e.date.toISOString().slice(0, 10);
    let row = byDate.get(dateKey);
    if (!row) {
      row = { date: dateKey, totalQty: 0, totalAmount: 0, byVendor: {} };
      byDate.set(dateKey, row);
    }
    row.totalQty += e.quantity;
    row.totalAmount += e.amount;
    const v = row.byVendor[e.vendorId] ?? { qty: 0, amount: 0 };
    v.qty += e.quantity;
    v.amount += e.amount;
    row.byVendor[e.vendorId] = v;
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}
