// Master list of commodities tracked in the Purchase & Consumption Costing
// sub-module, seeded once (prisma/seed.ts) and matched by name thereafter.
// `excelCols` records which columns of the ORIGINAL wide Excel sheet this
// item came from — used only by the import/export round-trip
// (app/lib/purchaseExcel.ts), not by the app's own data model.

export const PURCHASE_SUBMODULE_SLUG = "ketan-purchase-costing";

export interface PurchaseItemDef {
  name: string;
  unit: string; // blank if amount-only
  hasAmount: boolean;
  hasQuantity: boolean;
  sortOrder: number;
  excelAmountHeader?: string;
  excelQuantityHeader?: string;
}

export const PURCHASE_ITEMS: PurchaseItemDef[] = [
  { name: "Oil", unit: "Tin", hasAmount: true, hasQuantity: true, sortOrder: 1, excelAmountHeader: "Oil Bill Amount", excelQuantityHeader: "Oil Tin Purchase" },
  { name: "Rice", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 2, excelAmountHeader: "Rice Amount", excelQuantityHeader: "Rice Purchase kg" },
  { name: "Roti", unit: "Pcs", hasAmount: true, hasQuantity: true, sortOrder: 3, excelAmountHeader: "Roti Amount", excelQuantityHeader: "Total Roti in Month" },
  { name: "Paratha", unit: "Pcs", hasAmount: true, hasQuantity: true, sortOrder: 4, excelAmountHeader: "Paratha Amount", excelQuantityHeader: "Total Paratha in Month" },
  { name: "Poori", unit: "Pcs", hasAmount: true, hasQuantity: true, sortOrder: 5, excelAmountHeader: "Poori Amount", excelQuantityHeader: "Total Poori in Month" },
  { name: "Thepla", unit: "Pcs", hasAmount: true, hasQuantity: true, sortOrder: 6, excelAmountHeader: "Thepla Amount", excelQuantityHeader: "Total Thepla in Month" },
  { name: "Sugar", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 7, excelAmountHeader: "Sugar Amount", excelQuantityHeader: "Total Sugar in kg" },
  { name: "Atta", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 8, excelAmountHeader: "Atta Amount", excelQuantityHeader: "Atta in kg" },
  { name: "Besan", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 9, excelAmountHeader: "Besan Amount", excelQuantityHeader: "Besan in kg" },
  { name: "Maida", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 10, excelAmountHeader: "Maida Amount", excelQuantityHeader: "Maida in kg" },
  { name: "Tea Leaf", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 11, excelAmountHeader: "Tea Leaf Amount", excelQuantityHeader: "Tea Leaf in kg" },
  { name: "Ramdev Masala (Bill)", unit: "", hasAmount: true, hasQuantity: false, sortOrder: 12, excelAmountHeader: "Ramdev Masala Amount" },
  { name: "Mirchi Powder", unit: "Kg", hasAmount: false, hasQuantity: true, sortOrder: 13, excelQuantityHeader: "Mirchin in kg" },
  { name: "Dhaniya Powder", unit: "Kg", hasAmount: false, hasQuantity: true, sortOrder: 14, excelQuantityHeader: "Dhaniya powder in kg" },
  { name: "Masala Powder", unit: "Kg", hasAmount: false, hasQuantity: true, sortOrder: 15, excelQuantityHeader: "Masala powder in kg" },
  { name: "Haldi Powder", unit: "Kg", hasAmount: false, hasQuantity: true, sortOrder: 16, excelQuantityHeader: "Haldi powder in kg" },
  { name: "Tuver Dal", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 17, excelAmountHeader: "Tuver Dal Amount", excelQuantityHeader: "Tuver Dal in kg" },
  { name: "Vegetables", unit: "", hasAmount: true, hasQuantity: false, sortOrder: 18, excelAmountHeader: "Veg Amount" },
  { name: "Gas", unit: "Bottles", hasAmount: true, hasQuantity: true, sortOrder: 19, excelAmountHeader: "Gas Amount", excelQuantityHeader: "Gas in Bottles" },
  { name: "Wood", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 20, excelAmountHeader: "Wood Amount", excelQuantityHeader: "Wood In KG" },
  { name: "Milk", unit: "Ltrs", hasAmount: true, hasQuantity: true, sortOrder: 21, excelAmountHeader: "Milk Amount", excelQuantityHeader: "Milk in Ltrs" },
  { name: "Curd", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 22, excelAmountHeader: "Curd Amount", excelQuantityHeader: "Curd        in kg" },
  { name: "85gm Curd", unit: "Nos", hasAmount: true, hasQuantity: true, sortOrder: 23, excelAmountHeader: "85 gm Curd Amount", excelQuantityHeader: "85 gm Curd in Nos" },
  { name: "Loose/Creamy Curd", unit: "Kg", hasAmount: true, hasQuantity: true, sortOrder: 24, excelAmountHeader: "Loose Curd in Amount", excelQuantityHeader: "Loose/Creamy Curd in kg" },
  { name: "BM", unit: "Pcs", hasAmount: true, hasQuantity: true, sortOrder: 25, excelAmountHeader: "BM Amount", excelQuantityHeader: "BM in Pcs" },
  { name: "Other Purchases (MRP)", unit: "", hasAmount: true, hasQuantity: false, sortOrder: 26, excelAmountHeader: "MRP" },
];
