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
  pureVegQty: number;
  potatoQty: number;
  onionQty: number;
  countLD: number | null;
  perPlatePureVeg: number | null; // grams per plate
  perPlatePotato: number | null;
  perPlateOnion: number | null;
  perPlatePotatoOnion: number | null;
}

interface MonthAccum {
  jakirAmount: number; rajuAmount: number; pureVegAmount: number;
  potatoAmount: number; onionAmount: number; flakesAmount: number; fruitCashAmount: number;
  pureVegQty: number | null; potatoQty: number | null; onionQty: number | null;
}

function emptyAccum(): MonthAccum {
  return { jakirAmount: 0, rajuAmount: 0, pureVegAmount: 0, potatoAmount: 0, onionAmount: 0, flakesAmount: 0, fruitCashAmount: 0, pureVegQty: 0, potatoQty: 0, onionQty: 0 };
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
    if (e.vendor.name === "Jakir") m.jakirAmount += e.amount;
    else if (e.vendor.name === "Raju") m.rajuAmount += e.amount;
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
      pureVegQty: m.pureVegQty != null ? Math.round(m.pureVegQty * 100) / 100 : 0,
      potatoQty: m.potatoQty != null ? Math.round(m.potatoQty * 100) / 100 : 0,
      onionQty: m.onionQty != null ? Math.round(m.onionQty * 100) / 100 : 0,
      countLD,
      perPlatePureVeg: gramsPerPlate(m.pureVegQty),
      perPlatePotato,
      perPlateOnion,
      perPlatePotatoOnion: perPlatePotato != null && perPlateOnion != null ? Math.round((perPlatePotato + perPlateOnion) * 100) / 100 : null,
    };
  });
}
