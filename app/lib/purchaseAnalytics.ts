import { prisma } from "@/app/lib/prisma";

export interface StatsFilter {
  groupId?: number;
  subItem?: string;
  from?: string; // "YYYY-MM"
  to?: string; // "YYYY-MM"
}

export interface MonthlyCostPoint {
  monthLabel: string;
  monthKey: string;
  totalAmount: number;
}

export interface GroupCostBreakdown {
  groupId: number;
  name: string;
  unit: string;
  totalAmount: number;
  totalQuantity: number;
}

export interface GroupTrendPoint {
  monthLabel: string;
  monthKey: string;
  amount: number | null;
  quantity: number | null;
  costPerUnit: number | null;
}

export interface PurchaseStats {
  totalMonths: number;
  totalSpend: number;
  latestMonthLabel: string | null;
  latestMonthSpend: number | null;
  monthlyCostTrend: MonthlyCostPoint[];
  costByGroup: GroupCostBreakdown[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(d: Date) {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function monthKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

// A deduction entry (e.g. gas bottles handed to a vendor) subtracts from
// the group/month total instead of adding.
function signedAmount(e: { amount: number | null; isDeduction: boolean }) {
  return e.amount == null ? 0 : e.isDeduction ? -e.amount : e.amount;
}
function signedQuantity(e: { quantity: number | null; isDeduction: boolean }) {
  return e.quantity == null ? 0 : e.isDeduction ? -e.quantity : e.quantity;
}

function buildWhere(filter?: StatsFilter) {
  const where: Record<string, unknown> = {};
  if (filter?.groupId) where.groupId = filter.groupId;
  if (filter?.subItem) where.subItem = filter.subItem;
  if (filter?.from || filter?.to) {
    where.month = {
      ...(filter.from ? { gte: new Date(`${filter.from}-01`) } : {}),
      ...(filter.to ? { lte: new Date(new Date(`${filter.to}-01`).getFullYear(), new Date(`${filter.to}-01`).getMonth() + 1, 0) } : {}),
    };
  }
  return where;
}

export async function collectPurchaseStats(filter?: StatsFilter): Promise<PurchaseStats> {
  const entries = await prisma.purchaseEntry.findMany({ where: buildWhere(filter), include: { group: true } });

  const monthTotals = new Map<string, { date: Date; total: number }>();
  const groupTotals = new Map<number, GroupCostBreakdown>();

  for (const e of entries) {
    const key = monthKey(e.month);
    const existingMonth = monthTotals.get(key) ?? { date: e.month, total: 0 };
    existingMonth.total += signedAmount(e);
    monthTotals.set(key, existingMonth);

    const existingGroup = groupTotals.get(e.groupId) ?? {
      groupId: e.groupId,
      name: e.group.name,
      unit: e.group.unit,
      totalAmount: 0,
      totalQuantity: 0,
    };
    existingGroup.totalAmount += signedAmount(e);
    existingGroup.totalQuantity += signedQuantity(e);
    groupTotals.set(e.groupId, existingGroup);
  }

  const monthlyCostTrend: MonthlyCostPoint[] = [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ monthKey: key, monthLabel: monthLabel(v.date), totalAmount: v.total }));

  const costByGroup = [...groupTotals.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  const totalSpend = monthlyCostTrend.reduce((s, m) => s + m.totalAmount, 0);
  const latest = monthlyCostTrend[monthlyCostTrend.length - 1];

  return {
    totalMonths: monthlyCostTrend.length,
    totalSpend,
    latestMonthLabel: latest?.monthLabel ?? null,
    latestMonthSpend: latest?.totalAmount ?? null,
    monthlyCostTrend,
    costByGroup,
  };
}

// Per-month amount/quantity/cost-per-unit for ONE group — entries within
// the same month are summed first (net of deductions) so multiple vendor
// purchases in a month collapse into one point on the trend line.
export async function collectGroupTrend(groupId: number, filter?: Omit<StatsFilter, "groupId">): Promise<GroupTrendPoint[]> {
  const entries = await prisma.purchaseEntry.findMany({
    where: { ...buildWhere(filter), groupId },
    orderBy: { month: "asc" },
  });

  const byMonth = new Map<string, { date: Date; amount: number; quantity: number; hasAmount: boolean; hasQuantity: boolean }>();
  for (const e of entries) {
    const key = monthKey(e.month);
    const existing = byMonth.get(key) ?? { date: e.month, amount: 0, quantity: 0, hasAmount: false, hasQuantity: false };
    if (e.amount != null) { existing.amount += signedAmount(e); existing.hasAmount = true; }
    if (e.quantity != null) { existing.quantity += signedQuantity(e); existing.hasQuantity = true; }
    byMonth.set(key, existing);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      monthKey: key,
      monthLabel: monthLabel(v.date),
      amount: v.hasAmount ? Math.round(v.amount) : null,
      quantity: v.hasQuantity ? Math.round(v.quantity * 100) / 100 : null,
      costPerUnit: v.hasAmount && v.hasQuantity && v.quantity !== 0 ? Math.round((v.amount / v.quantity) * 100) / 100 : null,
    }));
}

export interface SubItemBreakdown {
  subItem: string;
  totalAmount: number;
  totalQuantity: number;
}

// Totals per physical item WITHIN a combined group (e.g. Roti vs Paratha
// vs Poori vs Thepla inside the Roti/Paratha/Poori/Thepla group) — lets the
// user pull each one out individually even though the group's overall
// figure is what feeds the top-level analysis.
export async function collectSubItemBreakdown(groupId: number, filter?: Omit<StatsFilter, "groupId" | "subItem">): Promise<SubItemBreakdown[]> {
  const entries = await prisma.purchaseEntry.findMany({ where: { ...buildWhere(filter), groupId } });

  const totals = new Map<string, SubItemBreakdown>();
  for (const e of entries) {
    const key = e.subItem || "(unspecified)";
    const existing = totals.get(key) ?? { subItem: key, totalAmount: 0, totalQuantity: 0 };
    existing.totalAmount += signedAmount(e);
    existing.totalQuantity += signedQuantity(e);
    totals.set(key, existing);
  }
  return [...totals.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}
