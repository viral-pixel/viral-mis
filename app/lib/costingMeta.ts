// Costing Reference — admin-only personal reference (Farsan, Sweets, ...),
// not tied to any employee's module. Category is free text w/ suggestions,
// same small-list pattern as Alkesh's commodity categories — new categories
// (e.g. "Sweets") just show up once the first item is added under that name.
export const COSTING_DEFAULT_CATEGORIES = ["Farsan", "Sweets"] as const;

export type CostingBasis = "PER_KG" | "PER_PIECE";
