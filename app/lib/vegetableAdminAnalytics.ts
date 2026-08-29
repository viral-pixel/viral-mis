import { prisma } from "@/app/lib/prisma";
import { monthKeyOf, monthLabelOf } from "@/app/lib/vegetableAnalytics";
import { HISTORICAL_CUTOFF_MONTH, VEGETABLE_HISTORICAL_SNAPSHOT } from "@/app/lib/vegetableHistoricalSnapshot";

// Admin-only cost analysis, private to Viral — mirrors the monthly report he
// maintained by hand in Excel, computed entirely from the same purchase
// data Ketan already enters. The one figure nothing else in the system
// tracks is "Count L/D" (lunch+dinner meals served company-wide that
// month), stored in MonthlyMealCount and entered manually here; every
// "per plate" ratio below is grams of that category divided by that count.
//
// Every month at or before HISTORICAL_CUTOFF_MONTH is frozen to Viral's own
// reconciled figures (see vegetableHistoricalSnapshot.ts — the database has
// a real gap before Aug 2025) rather than computed live; only months after
// the cutoff are computed from Ketan's actual entries. Count L/D likewise
// falls back to the snapshot's value for historical months, but an admin
// entry in MonthlyMealCount always takes priority if one exists.
//
// Per Viral's explicit call: Potato figures include Baby Potato (matches
// his "Vegetable Report" sheet, not "Pot-Oni-Veg Summ" which excludes it).
// Onion & Garlic Flakes has no quantity anywhere (amount-only by original
// design) — per his call, this dashboard doesn't try to track or show a
// flakes quantity/per-plate figure at all.

export interface AdminVegMonthRow {
  monthKey: string;
  monthLabel: string;
  jakirAmount: number;
  rajuAmount: number;
  pureVegAmount: number;
  potatoAmount: number;
  onionAmount: number;
  flakesAmount: number;
  fruitCashAmount: number;
  grandTotal: number;
  potatoPct: number | null;
  onionPct: number | null;
  flakesPct: number | null;
  nonVegPct: number | null;
  pureVegQty: number | null; // null = not tracked that month, distinct from a genuine zero
  potatoQty: number | null;
  onionQty: number | null;
  // Vendor-split quantity — only available for live months (Aug 2026+);
  // his own "Vegetable Report" sheet only ever tracked a combined Qty
  // Order, never split by vendor, so historical months are null here.
  jakirQty: number | null;
  rajuQty: number | null;
  countLD: number | null;
  perPlatePureVeg: number | null; // grams per plate
  perPlatePotato: number | null;
  perPlateOnion: number | null;
  perPlatePotatoOnion: number | null;
  perPlateJakir: number | null;
  perPlateRaju: number | null;
}

interface MonthAccum {
  jakirAmount: number; rajuAmount: number; pureVegAmount: number;
  potatoAmount: number; onionAmount: number; flakesAmount: number; fruitCashAmount: number;
  pureVegQty: number | null; potatoQty: number | null; onionQty: number | null;
  jakirQty: number | null; rajuQty: number | null;
}

function emptyAccum(): MonthAccum {
  return { jakirAmount: 0, rajuAmount: 0, pureVegAmount: 0, potatoAmount: 0, onionAmount: 0, flakesAmount: 0, fruitCashAmount: 0, pureVegQty: 0, potatoQty: 0, onionQty: 0, jakirQty: 0, rajuQty: 0 };
}

export async function collectAdminVegSummary(): Promise<AdminVegMonthRow[]> {
  const [vegEntries, potatoOnionEntries, cashEntries, mealCounts] = await Promise.all([
    prisma.vegetablePurchaseEntry.findMany({ include: { vendor: true } }),
    prisma.potatoOnionEntry.findMany(),
    prisma.cashPurchaseEntry.findMany(),
    prisma.monthlyMealCount.findMany(),
  ]);

  const months = new Map<string, MonthAccum>();
  const get = (key: string) => {
    let m = months.get(key);
    if (!m) { m = emptyAccum(); months.set(key, m); }
    return m;
  };

  for (const e of vegEntries) {
    const key = monthKeyOf(e.date);
    if (key <= HISTORICAL_CUTOFF_MONTH) continue; // frozen historical months are overlaid below, not computed live
    const m = get(key);
    if (e.vendor.name === "Jakir") { m.jakirAmount += e.amount; m.jakirQty = (m.jakirQty ?? 0) + e.quantity; }
    else if (e.vendor.name === "Raju") { m.rajuAmount += e.amount; m.rajuQty = (m.rajuQty ?? 0) + e.quantity; }
    m.pureVegAmount += e.amount;
    m.pureVegQty = (m.pureVegQty ?? 0) + e.quantity;
  }
  for (const e of potatoOnionEntries) {
    if (!e.billDate) continue;
    const key = monthKeyOf(e.billDate);
    if (key <= HISTORICAL_CUTOFF_MONTH) continue;
    const m = get(key);
    if (e.item === "Potato" || e.item === "Baby Potato") {
      m.potatoAmount += e.amount ?? 0;
      if (e.quantity != null) m.potatoQty = (m.potatoQty ?? 0) + e.quantity;
    } else if (e.item === "Onion") {
      m.onionAmount += e.amount ?? 0;
      if (e.quantity != null) m.onionQty = (m.onionQty ?? 0) + e.quantity;
    }
  }
  for (const e of cashEntries) {
    const key = monthKeyOf(e.date);
    if (key <= HISTORICAL_CUTOFF_MONTH) continue;
    const m = get(key);
    if (e.category === "Onion & Garlic Flakes") m.flakesAmount += e.amount;
    else if (e.category === "Fruit & Cash Purchase") m.fruitCashAmount += e.amount;
  }

  // Overlay the frozen historical months — fully replaces anything (there
  // shouldn't be any, since the loops above skip these months) computed live.
  for (const snap of VEGETABLE_HISTORICAL_SNAPSHOT) {
    months.set(snap.monthKey, {
      jakirAmount: snap.jakirAmount, rajuAmount: snap.rajuAmount, pureVegAmount: snap.jakirAmount + snap.rajuAmount,
      potatoAmount: snap.potatoAmount, onionAmount: snap.onionAmount, flakesAmount: snap.flakesAmount, fruitCashAmount: snap.fruitCashAmount,
      pureVegQty: snap.pureVegQty, potatoQty: snap.potatoQty, onionQty: snap.onionQty,
      jakirQty: null, rajuQty: null, // never split by vendor in his own reconciled sheet
    });
  }

  const mealCountByMonth = new Map(mealCounts.map((c) => [c.monthKey, c.countLD]));
  const historicalCountLD = new Map(VEGETABLE_HISTORICAL_SNAPSHOT.map((s) => [s.monthKey, s.countLD]));

  const sortedKeys = [...months.keys()].sort();
  return sortedKeys.map((key) => {
    const m = months.get(key)!;
    const grandTotal = m.pureVegAmount + m.potatoAmount + m.onionAmount + m.flakesAmount + m.fruitCashAmount;
    // An admin entry always wins over the historical default, so a
    // month's Count L/D can still be corrected later if needed.
    const countLD = mealCountByMonth.get(key) ?? historicalCountLD.get(key) ?? null;
    const gramsPerPlate = (qty: number | null) => (countLD && qty != null ? Math.round(((qty * 1000) / countLD) * 100) / 100 : null);
    const potatoPct = grandTotal ? Math.round((m.potatoAmount / grandTotal) * 1000) / 10 : null;
    const onionPct = grandTotal ? Math.round((m.onionAmount / grandTotal) * 1000) / 10 : null;
    const flakesPct = grandTotal ? Math.round((m.flakesAmount / grandTotal) * 1000) / 10 : null;
    const perPlatePotato = gramsPerPlate(m.potatoQty);
    const perPlateOnion = gramsPerPlate(m.onionQty);
    return {
      monthKey: key,
      monthLabel: monthLabelOf(key),
      jakirAmount: Math.round(m.jakirAmount),
      rajuAmount: Math.round(m.rajuAmount),
      pureVegAmount: Math.round(m.pureVegAmount),
      potatoAmount: Math.round(m.potatoAmount * 100) / 100,
      onionAmount: Math.round(m.onionAmount * 100) / 100,
      flakesAmount: Math.round(m.flakesAmount),
      fruitCashAmount: Math.round(m.fruitCashAmount),
      grandTotal: Math.round(grandTotal * 100) / 100,
      potatoPct, onionPct, flakesPct,
      nonVegPct: potatoPct != null && onionPct != null && flakesPct != null ? Math.round((potatoPct + onionPct + flakesPct) * 10) / 10 : null,
      pureVegQty: m.pureVegQty != null ? Math.round(m.pureVegQty * 100) / 100 : null,
      potatoQty: m.potatoQty != null ? Math.round(m.potatoQty * 100) / 100 : null,
      onionQty: m.onionQty != null ? Math.round(m.onionQty * 100) / 100 : null,
      jakirQty: m.jakirQty != null ? Math.round(m.jakirQty * 100) / 100 : null,
      rajuQty: m.rajuQty != null ? Math.round(m.rajuQty * 100) / 100 : null,
      countLD,
      perPlatePureVeg: gramsPerPlate(m.pureVegQty),
      perPlatePotato,
      perPlateOnion,
      perPlatePotatoOnion: perPlatePotato != null && perPlateOnion != null ? Math.round((perPlatePotato + perPlateOnion) * 100) / 100 : null,
      perPlateJakir: gramsPerPlate(m.jakirQty),
      perPlateRaju: gramsPerPlate(m.rajuQty),
    };
  });
}

// ---------------------------------------------------------------------
// "Pot-Oni-Veg Summ" replica — Potato here is POTATO-ONLY (Baby Potato
// excluded), a deliberately different figure from collectAdminVegSummary's
// combined Potato+Baby-Potato number above. Each of Viral's original sheets
// kept its own Potato definition; this preserves that instead of forcing
// the two reports to agree.
// ---------------------------------------------------------------------

export interface PotatoOnionSummaryRow {
  monthKey: string;
  monthLabel: string;
  potatoQty: number; // potato-only
  potatoAmount: number; // potato-only
  potatoAvgRate: number | null;
  onionQty: number | null;
  onionAmount: number;
  onionAvgRate: number | null;
  totalPOQty: number;
  totalPOAmount: number;
  grandTotal: number; // same "Total Veg Exp" as the monthly summary
  potatoPctOfVeg: number | null;
  onionPctOfVeg: number | null;
  totalPctOfVeg: number | null;
  monthlyDays: number;
  totalVegQty: number | null; // pure veg qty, reused
  avgPDQtyPureVeg: number | null; // per calendar day, NOT per plate
  avgPDQtyPotato: number | null;
  avgPDQtyOnion: number | null;
  countLD: number | null;
  perPlatePureVeg: number | null;
  perPlatePotato: number | null;
  perPlateOnion: number | null;
  perPlateTotalVeg: number | null;
}

function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export async function collectPotatoOnionSummary(): Promise<PotatoOnionSummaryRow[]> {
  const [baseRows, potatoOnlyEntries] = await Promise.all([
    collectAdminVegSummary(),
    prisma.potatoOnionEntry.findMany({ where: { item: "Potato" } }),
  ]);

  const livePotatoOnly = new Map<string, { qty: number; amount: number }>();
  for (const e of potatoOnlyEntries) {
    if (!e.billDate) continue;
    const key = monthKeyOf(e.billDate);
    if (key <= HISTORICAL_CUTOFF_MONTH) continue; // historical months use the frozen snapshot instead
    const existing = livePotatoOnly.get(key) ?? { qty: 0, amount: 0 };
    if (e.quantity != null) existing.qty += e.quantity;
    existing.amount += e.amount ?? 0;
    livePotatoOnly.set(key, existing);
  }
  const historicalPotatoOnly = new Map(VEGETABLE_HISTORICAL_SNAPSHOT.map((s) => [s.monthKey, { qty: s.potatoOnlyQty, amount: s.potatoOnlyAmount }]));

  return baseRows.map((r) => {
    const potatoOnly = historicalPotatoOnly.get(r.monthKey) ?? livePotatoOnly.get(r.monthKey) ?? { qty: 0, amount: 0 };
    const days = daysInMonth(r.monthKey);
    const onionQty = r.onionQty ?? 0;
    const potatoPctOfVeg = r.grandTotal ? Math.round((potatoOnly.amount / r.grandTotal) * 1000) / 10 : null;
    const onionPctOfVeg = r.onionPct; // onion is identical between both sheets
    const perDay = (qty: number | null) => (qty ? Math.round((qty / days) * 100) / 100 : null);
    const gramsPerPlate = (qty: number | null) => (r.countLD && qty != null ? Math.round(((qty * 1000) / r.countLD) * 100) / 100 : null);
    return {
      monthKey: r.monthKey,
      monthLabel: r.monthLabel,
      potatoQty: Math.round(potatoOnly.qty * 100) / 100,
      potatoAmount: Math.round(potatoOnly.amount * 100) / 100,
      potatoAvgRate: potatoOnly.qty ? Math.round((potatoOnly.amount / potatoOnly.qty) * 100) / 100 : null,
      onionQty: r.onionQty,
      onionAmount: r.onionAmount,
      onionAvgRate: onionQty ? Math.round((r.onionAmount / onionQty) * 100) / 100 : null,
      totalPOQty: Math.round((potatoOnly.qty + onionQty) * 100) / 100,
      totalPOAmount: Math.round((potatoOnly.amount + r.onionAmount) * 100) / 100,
      grandTotal: r.grandTotal,
      potatoPctOfVeg, onionPctOfVeg,
      totalPctOfVeg: potatoPctOfVeg != null && onionPctOfVeg != null ? Math.round((potatoPctOfVeg + onionPctOfVeg) * 10) / 10 : null,
      monthlyDays: days,
      totalVegQty: r.pureVegQty,
      avgPDQtyPureVeg: perDay(r.pureVegQty),
      avgPDQtyPotato: perDay(potatoOnly.qty),
      avgPDQtyOnion: perDay(r.onionQty),
      countLD: r.countLD,
      perPlatePureVeg: r.perPlatePureVeg,
      perPlatePotato: gramsPerPlate(potatoOnly.qty),
      perPlateOnion: r.perPlateOnion,
      perPlateTotalVeg: r.pureVegQty != null ? gramsPerPlate(r.pureVegQty + potatoOnly.qty + onionQty) : null,
    };
  });
}

// ---------------------------------------------------------------------
// "Veg Analysis" replica — one row per item, Jakir vs Raju side by side,
// for one month. Always computed live from Ketan's day-level entries
// (never frozen), since the database's item-level detail is real and
// complete from August 2025 onward — more granular than anything Viral
// reconciled by hand, so there's no reason to freeze it. July 2025 is the
// one month with no item-level data at all (same root gap as everywhere
// else in this dashboard), and will show correctly as all-zero rows.
// ---------------------------------------------------------------------

export interface ItemWiseRow {
  srNo: number;
  itemName: string;
  jakirRate: number | null;
  rajuRate: number | null;
  jakirQty: number;
  rajuQty: number;
  totalQty: number;
  jakirAmount: number;
  rajuAmount: number;
  totalAmount: number;
  // Flags vs the trailing 3-month average for this item (blended across
  // vendors) — the user's own request to surface "this vegetable seems too
  // high in quantity" or "rate is 15-20% above the usual trend" without
  // having to eyeball every row by hand. null when there's no trailing
  // baseline yet (item has no purchases in the prior 3 months).
  rateChangePct: number | null;
  qtyChangePct: number | null;
  rateFlag: "high" | "low" | null;
  qtyFlag: "high" | null;
}

export interface ItemWiseAnalysis {
  monthKey: string;
  monthLabel: string;
  items: ItemWiseRow[];
  totalJakirQty: number;
  totalJakirAmount: number;
  totalRajuQty: number;
  totalRajuAmount: number;
  totalVegQty: number;
  totalVegAmount: number;
  fruitCashAmount: number;
  grandTotalWithFruit: number;
  monthlyDays: number;
  avgPerDayQty: number | null; // veg qty only per calendar day (no fruit quantity exists to include)
  avgPerDayAmount: number | null; // veg + fruit combined per calendar day
}

const RATE_FLAG_THRESHOLD_PCT = 15; // matches the user's own "15-20%" framing
const QTY_FLAG_THRESHOLD_PCT = 40; // quantity naturally swings more than rate — a higher bar
const FLAG_MIN_AMOUNT = 1000; // ignore trivial purchases — a ₹100 buy swinging 300% isn't a meaningful signal

export async function collectItemWiseAnalysis(month: string): Promise<ItemWiseAnalysis> {
  const from = new Date(`${month}-01`);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  // Trailing 3 calendar months immediately before the selected one, used as
  // the "usual trend" baseline for the flags below.
  const trailingFrom = new Date(from.getFullYear(), from.getMonth() - 3, 1);
  const trailingTo = new Date(from.getFullYear(), from.getMonth(), 0);

  const [items, entries, cashEntries, trailingEntries] = await Promise.all([
    prisma.vegetableItem.findMany({ orderBy: { srNo: "asc" } }),
    prisma.vegetablePurchaseEntry.findMany({ where: { date: { gte: from, lte: to } }, include: { item: true, vendor: true } }),
    prisma.cashPurchaseEntry.findMany({ where: { date: { gte: from, lte: to }, category: "Fruit & Cash Purchase" } }),
    prisma.vegetablePurchaseEntry.findMany({ where: { date: { gte: trailingFrom, lte: trailingTo } } }),
  ]);

  const byItem = new Map<number, { jakirQty: number; jakirAmt: number; rajuQty: number; rajuAmt: number }>();
  for (const e of entries) {
    const existing = byItem.get(e.itemId) ?? { jakirQty: 0, jakirAmt: 0, rajuQty: 0, rajuAmt: 0 };
    if (e.vendor.name === "Jakir") { existing.jakirQty += e.quantity; existing.jakirAmt += e.amount; }
    else if (e.vendor.name === "Raju") { existing.rajuQty += e.quantity; existing.rajuAmt += e.amount; }
    byItem.set(e.itemId, existing);
  }

  const trailingByItem = new Map<number, { qty: number; amount: number }>();
  for (const e of trailingEntries) {
    const existing = trailingByItem.get(e.itemId) ?? { qty: 0, amount: 0 };
    existing.qty += e.quantity;
    existing.amount += e.amount;
    trailingByItem.set(e.itemId, existing);
  }

  let totalJakirQty = 0, totalJakirAmount = 0, totalRajuQty = 0, totalRajuAmount = 0;
  const rows: ItemWiseRow[] = items.map((item) => {
    const t = byItem.get(item.id) ?? { jakirQty: 0, jakirAmt: 0, rajuQty: 0, rajuAmt: 0 };
    const totalQty = Math.round((t.jakirQty + t.rajuQty) * 100) / 100;
    const totalAmount = Math.round(t.jakirAmt + t.rajuAmt);
    totalJakirQty += t.jakirQty; totalJakirAmount += t.jakirAmt;
    totalRajuQty += t.rajuQty; totalRajuAmount += t.rajuAmt;

    const trailing = trailingByItem.get(item.id);
    const material = totalAmount >= FLAG_MIN_AMOUNT && (trailing?.amount ?? 0) >= FLAG_MIN_AMOUNT;
    const trailingAvgQty = trailing && trailing.qty > 0 ? trailing.qty / 3 : null;
    const trailingAvgRate = trailing && trailing.qty > 0 ? trailing.amount / trailing.qty : null;
    const currentRate = totalQty > 0 ? totalAmount / totalQty : null;
    const rateChangePct = material && trailingAvgRate && currentRate != null ? Math.round(((currentRate - trailingAvgRate) / trailingAvgRate) * 1000) / 10 : null;
    const qtyChangePct = material && trailingAvgQty && totalQty > 0 ? Math.round(((totalQty - trailingAvgQty) / trailingAvgQty) * 1000) / 10 : null;

    return {
      srNo: item.srNo,
      itemName: item.name,
      jakirRate: t.jakirQty ? Math.round((t.jakirAmt / t.jakirQty) * 100) / 100 : null,
      rajuRate: t.rajuQty ? Math.round((t.rajuAmt / t.rajuQty) * 100) / 100 : null,
      jakirQty: Math.round(t.jakirQty * 100) / 100,
      rajuQty: Math.round(t.rajuQty * 100) / 100,
      totalQty,
      jakirAmount: Math.round(t.jakirAmt),
      rajuAmount: Math.round(t.rajuAmt),
      totalAmount,
      rateChangePct,
      qtyChangePct,
      rateFlag: rateChangePct == null ? null : rateChangePct >= RATE_FLAG_THRESHOLD_PCT ? "high" : rateChangePct <= -RATE_FLAG_THRESHOLD_PCT ? "low" : null,
      qtyFlag: qtyChangePct != null && qtyChangePct >= QTY_FLAG_THRESHOLD_PCT ? "high" : null,
    };
  });

  const fruitCashAmount = Math.round(cashEntries.reduce((s, e) => s + e.amount, 0));
  const totalVegQty = Math.round((totalJakirQty + totalRajuQty) * 100) / 100;
  const totalVegAmount = Math.round(totalJakirAmount + totalRajuAmount);
  const grandTotalWithFruit = totalVegAmount + fruitCashAmount;
  const days = daysInMonth(month);

  return {
    monthKey: month,
    monthLabel: monthLabelOf(month),
    items: rows,
    totalJakirQty: Math.round(totalJakirQty * 100) / 100,
    totalJakirAmount: Math.round(totalJakirAmount),
    totalRajuQty: Math.round(totalRajuQty * 100) / 100,
    totalRajuAmount: Math.round(totalRajuAmount),
    totalVegQty,
    totalVegAmount,
    fruitCashAmount,
    grandTotalWithFruit,
    monthlyDays: days,
    avgPerDayQty: totalVegQty ? Math.round(totalVegQty / days) : null,
    avgPerDayAmount: grandTotalWithFruit ? Math.round(grandTotalWithFruit / days) : null,
  };
}
