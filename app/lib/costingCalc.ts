// Pure derivation of the source sheet's formula columns from ratePerUnit —
// computed here instead of stored, so editing a rate recalculates everything
// live instead of going stale the way the source's copy-pasted Excel
// formulas would. Mirrors app/lib/rotiSummary.ts's "derive, don't store"
// pattern.

export interface CostingItemInput {
  ratePerUnit: number;
  costBasis: string; // "PER_KG" | "PER_PIECE"
  conversionFactor: number;
  wastagePct: number;
  accompanimentsCost: number | null;
  tadkaCost: number | null;
}

export interface CostingItemDerived {
  costPerPerson: number;
  wastageAmount: number;
  actualCostPerPerson: number;
  addOnsTotal: number | null; // null = Pending (accompaniments/tadka not yet costed)
  approxTotalCost: number | null; // null = Pending
}

export function computeCostingRow(item: CostingItemInput): CostingItemDerived {
  const costPerPerson =
    item.costBasis === "PER_PIECE" ? item.ratePerUnit * item.conversionFactor : item.ratePerUnit / item.conversionFactor;
  const wastageAmount = costPerPerson * (item.wastagePct / 100);
  const actualCostPerPerson = costPerPerson + wastageAmount;

  // "Pending" in the source means neither add-on has been costed yet, as
  // opposed to a genuine 0 (Khandvi/Handvo, which just have no add-ons at
  // all) — both accompanimentsCost and tadkaCost being null is the signal.
  const isPending = item.accompanimentsCost == null && item.tadkaCost == null;

  if (isPending) {
    return { costPerPerson, wastageAmount, actualCostPerPerson, addOnsTotal: null, approxTotalCost: null };
  }
  const addOnsTotal = (item.accompanimentsCost ?? 0) + (item.tadkaCost ?? 0);
  return { costPerPerson, wastageAmount, actualCostPerPerson, addOnsTotal, approxTotalCost: addOnsTotal + actualCostPerPerson };
}

// Sweets recipes: batch cost (sum of ingredients, wastage already included
// as its own ingredient row) ÷ batch qty = cost per batch unit, × a serving
// fraction = cost per serving. Verified against all 9 sweets in the source
// sheet — this single formula reproduces every one of its own final figures
// exactly once batchQty/servingConversionFactor are set per recipe.
export interface CostingRecipeDerived {
  totalAmount: number;
  costPerBatchUnit: number;
  costPerServing: number;
}

export function computeRecipeRow(
  ingredients: { amount: number }[],
  batchQty: number,
  servingConversionFactor: number
): CostingRecipeDerived {
  const totalAmount = ingredients.reduce((s, i) => s + i.amount, 0);
  const costPerBatchUnit = batchQty > 0 ? totalAmount / batchQty : 0;
  const costPerServing = costPerBatchUnit * servingConversionFactor;
  return { totalAmount, costPerBatchUnit, costPerServing };
}
