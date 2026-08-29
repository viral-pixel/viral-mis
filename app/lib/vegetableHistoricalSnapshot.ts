// Viral's own monthly reconciliation, from "Vegetable Report_Viral.xlsx" —
// treated as authoritative through July 2026 per his explicit instruction.
// Our system's day-level vendor data has a real gap (no Jakir/Raju daily
// entries exist for July 2025 at all, even though every other category
// does), so rather than silently showing a wrong figure for that stretch,
// every month at or before the cutoff is frozen to these reconciled totals
// instead of being computed live. From August 2026 onward the admin
// dashboard computes live from Ketan's actual entries, "to have more
// clarity and transparency" (Viral's words) once the data is complete.
//
// Potato figures are Potato + Baby Potato combined, matching his
// "Vegetable Report" sheet (his explicit choice over the alternate
// Potato-only figure in his "Pot-Oni-Veg Summ" sheet).
//
// Quantity fields are null where his own sheet didn't track quantity yet
// (Jul–Oct 2025) — per-plate ratios for those months are correctly shown
// as unknown ("—") rather than a misleading 0.

export const HISTORICAL_CUTOFF_MONTH = "2026-07"; // inclusive

export interface HistoricalMonthRow {
  monthKey: string;
  jakirAmount: number;
  rajuAmount: number;
  potatoAmount: number;
  onionAmount: number;
  flakesAmount: number;
  fruitCashAmount: number;
  pureVegQty: number | null;
  potatoQty: number | null;
  onionQty: number | null;
  countLD: number;
}

export const VEGETABLE_HISTORICAL_SNAPSHOT: HistoricalMonthRow[] = [
  { monthKey: "2025-07", jakirAmount: 1265729.9, rajuAmount: 0, potatoAmount: 206704, onionAmount: 152673.34, flakesAmount: 18750, fruitCashAmount: 26487, pureVegQty: null, potatoQty: null, onionQty: null, countLD: 215360 },
  { monthKey: "2025-08", jakirAmount: 971090, rajuAmount: 0, potatoAmount: 204720.1, onionAmount: 173652.5, flakesAmount: 13145, fruitCashAmount: 21054, pureVegQty: null, potatoQty: null, onionQty: null, countLD: 196032 },
  { monthKey: "2025-09", jakirAmount: 1063875, rajuAmount: 0, potatoAmount: 151961, onionAmount: 138664, flakesAmount: 0, fruitCashAmount: 22615, pureVegQty: null, potatoQty: null, onionQty: null, countLD: 217066 },
  { monthKey: "2025-10", jakirAmount: 971099, rajuAmount: 0, potatoAmount: 175365, onionAmount: 165472, flakesAmount: 0, fruitCashAmount: 12908, pureVegQty: null, potatoQty: null, onionQty: null, countLD: 192152 },
  { monthKey: "2025-11", jakirAmount: 1078373, rajuAmount: 0, potatoAmount: 164058, onionAmount: 136993, flakesAmount: 0, fruitCashAmount: 16080, pureVegQty: 30033, potatoQty: 10084, onionQty: 10330, countLD: 180189 },
  { monthKey: "2025-12", jakirAmount: 1037500, rajuAmount: 0, potatoAmount: 205755, onionAmount: 157774, flakesAmount: 34200, fruitCashAmount: 18083, pureVegQty: 37178, potatoQty: 14190, onionQty: 11463, countLD: 193558 },
  { monthKey: "2026-01", jakirAmount: 1037107, rajuAmount: 0, potatoAmount: 160300, onionAmount: 99657, flakesAmount: 34200, fruitCashAmount: 18743, pureVegQty: 38249.5, potatoQty: 11450, onionQty: 6640, countLD: 185161 },
  { monthKey: "2026-02", jakirAmount: 852912, rajuAmount: 0, potatoAmount: 86168, onionAmount: 114540, flakesAmount: 34200, fruitCashAmount: 31819, pureVegQty: 34689.5, potatoQty: 8068, onionQty: 9152, countLD: 173931 },
  { monthKey: "2026-03", jakirAmount: 832051, rajuAmount: 0, potatoAmount: 125762, onionAmount: 160507, flakesAmount: 34200, fruitCashAmount: 44800, pureVegQty: 35073, potatoQty: 10829, onionQty: 11541, countLD: 177910 },
  { monthKey: "2026-04", jakirAmount: 860355, rajuAmount: 0, potatoAmount: 126810, onionAmount: 156123, flakesAmount: 68400, fruitCashAmount: 35355, pureVegQty: 36577, potatoQty: 11150, onionQty: 9655, countLD: 190021 },
  { monthKey: "2026-05", jakirAmount: 502508, rajuAmount: 661073, potatoAmount: 154489, onionAmount: 162207, flakesAmount: 34236, fruitCashAmount: 41740, pureVegQty: 43417.3, potatoQty: 11157, onionQty: 10930, countLD: 195842 },
  { monthKey: "2026-06", jakirAmount: 581982.5, rajuAmount: 712288.69, potatoAmount: 160079, onionAmount: 125451, flakesAmount: 34200, fruitCashAmount: 46373, pureVegQty: 38293.1, potatoQty: 11776, onionQty: 8308, countLD: 203223 },
  { monthKey: "2026-07", jakirAmount: 502855, rajuAmount: 661424.95, potatoAmount: 128880, onionAmount: 175299, flakesAmount: 99964, fruitCashAmount: 9745, pureVegQty: 33035.3, potatoQty: 10660, onionQty: 9359, countLD: 191893 },
];
