import { prisma } from "@/app/lib/prisma";

export interface MonthlyCostPoint {
  monthLabel: string; // "Apr 2025"
  monthKey: string; // "2025-04-01" (sortable, used as a link target)
  totalAmount: number;
}

export interface ItemCostBreakdown {
  itemId: number;
  name: string;
  unit: string;
  totalAmount: number;
  totalQuantity: number;
}

export interface ItemTrendPoint {
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
  costByItem: ItemCostBreakdown[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(d: Date) {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function monthKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function collectPurchaseStats(): Promise<PurchaseStats> {
  const entries = await prisma.monthlyPurchase.findMany({ include: { itemCategory: true } });

  const monthTotals = new Map<string, { date: Date; total: number }>();
  const itemTotals = new Map<number, ItemCostBreakdown>();

  for (const e of entries) {
    const key = monthKey(e.month);
    const existingMonth = monthTotals.get(key) ?? { date: e.month, total: 0 };
    existingMonth.total += e.amount ?? 0;
    monthTotals.set(key, existingMonth);

    const existingItem = itemTotals.get(e.itemCategoryId) ?? {
      itemId: e.itemCategoryId,
      name: e.itemCategory.name,
      unit: e.itemCategory.unit,
      totalAmount: 0,
      totalQuantity: 0,
    };
    existingItem.totalAmount += e.amount ?? 0;
    existingItem.totalQuantity += e.quantity ?? 0;
    itemTotals.set(e.itemCategoryId, existingItem);
  }

  const monthlyCostTrend: MonthlyCostPoint[] = [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ monthKey: key, monthLabel: monthLabel(v.date), totalAmount: v.total }));

  const costByItem = [...itemTotals.values()].sort((a, b) => b.totalAmount - a.totalAmount);

  const totalSpend = monthlyCostTrend.reduce((s, m) => s + m.totalAmount, 0);
  const latest = monthlyCostTrend[monthlyCostTrend.length - 1];

  return {
    totalMonths: monthlyCostTrend.length,
    totalSpend,
    latestMonthLabel: latest?.monthLabel ?? null,
    latestMonthSpend: latest?.totalAmount ?? null,
    monthlyCostTrend,
    costByItem,
  };
}

export async function collectItemTrend(itemId: number): Promise<ItemTrendPoint[]> {
  const entries = await prisma.monthlyPurchase.findMany({
    where: { itemCategoryId: itemId },
    orderBy: { month: "asc" },
  });
  return entries.map((e) => ({
    monthLabel: monthLabel(e.month),
    monthKey: monthKey(e.month),
    amount: e.amount,
    quantity: e.quantity,
    costPerUnit: e.amount && e.quantity ? Math.round((e.amount / e.quantity) * 100) / 100 : null,
  }));
}
