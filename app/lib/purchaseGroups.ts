// Costing analysis groups for the Purchase & Consumption Costing
// sub-module. Redesigned 2026-08-29 per the user's real workflow: several
// commodities are analyzed together as one group even though multiple
// vendor purchases happen within it each month (see PurchaseEntry in
// schema.prisma). `oldItemNames` is used only by the one-off migration
// script that moved data from the original flat-item model — not read by
// the app itself.

export const PURCHASE_SUBMODULE_SLUG = "ketan-purchase-costing";

export interface PurchaseGroupDef {
  name: string;
  unit: string; // blank if amount-only or genuinely mixed-unit
  hasAmount: boolean;
  hasQuantity: boolean;
  sortOrder: number;
  oldItemNames: string[];
}

export const PURCHASE_GROUPS: PurchaseGroupDef[] = [
  { name: "Oil", unit: "Tin", hasAmount: true, hasQuantity: true, sortOrder: 1, oldItemNames: ["Oil"] },
  { name: "Rice", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 2, oldItemNames: ["Rice"] },
  { name: "Roti / Paratha / Poori / Thepla", unit: "Nos", hasAmount: true, hasQuantity: true, sortOrder: 3, oldItemNames: ["Roti", "Paratha", "Poori", "Thepla"] },
  { name: "Sugar", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 4, oldItemNames: ["Sugar"] },
  { name: "Atta", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 5, oldItemNames: ["Atta"] },
  { name: "Besan", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 6, oldItemNames: ["Besan"] },
  { name: "Maida", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 7, oldItemNames: ["Maida"] },
  { name: "Tea Leaf", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 8, oldItemNames: ["Tea Leaf"] },
  { name: "Masala", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 9, oldItemNames: ["Ramdev Masala (Bill)", "Mirchi Powder", "Dhaniya Powder", "Masala Powder", "Haldi Powder"] },
  { name: "Tuver Dal", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 10, oldItemNames: ["Tuver Dal"] },
  { name: "Vegetables", unit: "", hasAmount: true, hasQuantity: false, sortOrder: 11, oldItemNames: ["Vegetables"] },
  { name: "Gas & Wood", unit: "", hasAmount: true, hasQuantity: true, sortOrder: 12, oldItemNames: ["Gas", "Wood"] },
  { name: "Milk", unit: "Ltrs", hasAmount: true, hasQuantity: true, sortOrder: 13, oldItemNames: ["Milk"] },
  { name: "Curd Items", unit: "Count", hasAmount: true, hasQuantity: true, sortOrder: 14, oldItemNames: ["Curd", "85gm Curd", "Loose/Creamy Curd", "BM"] },
  { name: "Other Purchases (MRP)", unit: "", hasAmount: true, hasQuantity: false, sortOrder: 15, oldItemNames: ["Other Purchases (MRP)"] },
];
