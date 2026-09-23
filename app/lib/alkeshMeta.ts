// "Kitchen Weekly MIS" sub-module (Alkesh Reports module, Alkesh Labana).
export const ALKESH_MODULE_NAME = "Alkesh Reports";
export const ALKESH_SUBMODULE_SLUG = "alkesh-kitchen-mis";

// Gas/Oil + the six Provision items — one fixed list, matches
// AlkeshCommodityEntry.category. "Gas" and "Oil" get their own Weekly MIS
// line; the six Provision items are summed into one "Provision" line,
// mirroring the source sheet's own "Provision Consuption" = Oil + Provision.
export const ALKESH_GAS_CATEGORY = "Gas";
export const ALKESH_OIL_CATEGORY = "Oil";
export const ALKESH_PROVISION_ITEMS = ["Atta", "Rice", "Besan", "Maida", "Sugar", "Toor Dal"] as const;
export const ALKESH_COMMODITY_CATEGORIES = [ALKESH_GAS_CATEGORY, ALKESH_OIL_CATEGORY, ...ALKESH_PROVISION_ITEMS] as const;

// Weekly MIS report lines, in display order. Mixed units, matching the
// source (Roti already sat in the same grid as a piece count despite
// everything else being Rs): MRP/Gas/Provision/Vegetable are Rs; Milk/Curd
// are Ltr/Kg; Buttermilk and Roti are pcs. Alkesh's simplified entry has no
// rate field (deliberately, to keep his entry to just a quantity + Tea/
// Pantry toggle), so unlike the source these three can't be converted to Rs.
export const WEEKLY_MIS_LINES = ["MRP", "Buttermilk", "Curd", "Milk", "Gas", "Provision", "Vegetable", "Roti"] as const;
export type WeeklyMisLine = (typeof WEEKLY_MIS_LINES)[number];
export const WEEKLY_MIS_UNITS: Record<WeeklyMisLine, string> = {
  MRP: "₹", Gas: "₹", Provision: "₹", Vegetable: "₹",
  Milk: "Ltr", Curd: "Kg", Buttermilk: "pcs", Roti: "pcs",
};

// Weeks within a month, fixed 7-day buckets (1-7, 8-14, 15-21, 22-28,
// 29-end) — a clean simplification of the source's irregular week
// boundaries (which drifted sheet to sheet, e.g. "1-2","3-9","10-16"...).
export function weekBucketsForMonth(monthKey: string): { label: string; startDay: number; endDay: number }[] {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const buckets: { label: string; startDay: number; endDay: number }[] = [];
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth);
    buckets.push({ label: `${start}-${end}`, startDay: start, endDay: end });
  }
  return buckets;
}

export function weekIndexForDate(date: Date): number {
  const day = date.getUTCDate();
  return Math.floor((day - 1) / 7); // 0-based week index within the month
}

export function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}
