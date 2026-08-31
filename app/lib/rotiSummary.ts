// Pure aggregation over RotiLineItem-shaped rows — no DB access, so this is
// safe to import from both API routes (after a Prisma fetch) and directly
// from the client (for a live summary preview while Kiran is still typing
// into the entry grid, before anything is saved).
//
// Mirrors the block of formulas that sat to the right of the Remark column
// in the source Excel (site-wise Lunch/Dinner/Total, per-category Lunch/
// Dinner totals, grand totals) — computed here instead of stored, so it can
// never drift out of sync with the raw entries the way copy-pasted Excel
// formulas could.

export interface RotiMasterRef {
  id: number;
  name: string;
}

export interface RotiLineInput {
  siteId: number;
  mealTypeId: number;
  categoryId: number;
  quantity: number;
}

export interface RotiSiteSummary {
  siteId: number;
  siteName: string;
  byMeal: Record<number, number>; // mealTypeId -> total
  total: number;
}

export interface RotiCategorySummary {
  categoryId: number;
  categoryName: string;
  byMeal: Record<number, number>; // mealTypeId -> total
  total: number;
}

export interface RotiDaySummary {
  perSite: RotiSiteSummary[];
  perCategory: RotiCategorySummary[];
  byMeal: Record<number, number>; // mealTypeId -> grand total for that meal
  grandTotal: number;
}

export function computeRotiSummary(
  sites: RotiMasterRef[],
  mealTypes: RotiMasterRef[],
  categories: RotiMasterRef[],
  lines: RotiLineInput[]
): RotiDaySummary {
  const perSite: RotiSiteSummary[] = sites.map((site) => {
    const byMeal: Record<number, number> = {};
    for (const mt of mealTypes) byMeal[mt.id] = 0;
    let total = 0;
    for (const line of lines) {
      if (line.siteId !== site.id) continue;
      byMeal[line.mealTypeId] = (byMeal[line.mealTypeId] ?? 0) + line.quantity;
      total += line.quantity;
    }
    return { siteId: site.id, siteName: site.name, byMeal, total };
  });

  const perCategory: RotiCategorySummary[] = categories.map((cat) => {
    const byMeal: Record<number, number> = {};
    for (const mt of mealTypes) byMeal[mt.id] = 0;
    let total = 0;
    for (const line of lines) {
      if (line.categoryId !== cat.id) continue;
      byMeal[line.mealTypeId] = (byMeal[line.mealTypeId] ?? 0) + line.quantity;
      total += line.quantity;
    }
    return { categoryId: cat.id, categoryName: cat.name, byMeal, total };
  });

  const byMeal: Record<number, number> = {};
  for (const mt of mealTypes) byMeal[mt.id] = 0;
  let grandTotal = 0;
  for (const line of lines) {
    byMeal[line.mealTypeId] = (byMeal[line.mealTypeId] ?? 0) + line.quantity;
    grandTotal += line.quantity;
  }

  return { perSite, perCategory, byMeal, grandTotal };
}
