import { VEGETABLE_ITEMS } from "@/app/lib/vegetableItems";

// Ambe Enterprise issues real GST tax invoices (not scanned/handwritten), so
// the PDF has a genuine text layer — no OCR/AI needed, just a layout-aware
// parser. pdf-parse does NOT preserve the visual table column order; each
// line item instead comes out as this fixed 6-line block (verified against
// five real sample invoices, including a 2-page one):
//
//   <HSN NO> <SR NO>
//   <PARTICULARS>
//   <QTY> <GST %>
//   <TAXABLE AMOUNT>
//   <RATE WITH TAX>
//   <RATE WITHOUT TAX>
//
// Multi-page bills need no special handling — pdf-parse concatenates page
// text in order, and a continuation page simply has no item blocks before
// hitting the TOTAL/TAX DETAIL footer.
const ITEM_BLOCK_RE =
  /(\d{2,10})\s+(\d{1,3})\n([A-Z][A-Z0-9 ()/.\-]*?)\n\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\n\s*([\d,]+\.\d{2})\n\s*([\d,]+\.\d{2})\n\s*([\d,]+\.\d{2})\n/g;

// PARTICULARS text -> our VegetableItem master list name. Built from every
// distinct item name seen across the sample invoices; extend this table
// whenever Ambe introduces a new item name that shows up unmatched.
const AMBE_ITEM_MAP: Record<string, string> = {
  "GINGER FRESH": "Ginger",
  "CARROT": "Carrot",
  "CARROT GREVY": "Carrot (Gravy)",
  "CUCUMBER": "Cucumber",
  "CORIANDER": "Coriander Leaves",
  "TOMATO (SALAD)": "Tomato",
  "CABBAGE GREEN": "Cabbage",
  "GREEN CHILY": "Green Chilly",
  "GREEN CHILLY PATA": "Green Chilly",
  "BEETROOT": "Beet",
  "LAUKI": "Bottleguard",
  "GARLIC PEELED": "Garlic",
  "SPINACH": "Spinach",
  "MINT": "Mint Leaves",
  "RAW BANANA": "Banana Raw",
  "RAW PAPAYA": "Papaya Raw",
  "PAPAYA": "Papaya",
  "CAPSICUM": "Capsicum",
  "BAINHGAN BHARTA": "Brinjal Big",
  "CURRY LEAVES": "Curry Leaves",
  "TINDOLA": "Ivy Guard",
  "CAULIFOWER PEELED": "Cauliflower",
  "SPRING ONION": "spring onion",
  "GAVAR": "Cluster Beans (Gavar)",
  "RED PUMKIN": "Pumpkin",
  "GREEN PEAS FROZEN": "Green Peas",
  "WATER MELON": "Water melon",
  "BANANA": "Banana",
  "LEMON": "Lemon",
  "DRUMSTICKS": "Drumstick",
  "LADY FINGER": "Ladyfinger",
  "AMERICAN CONE": "Corn",
};

function normalizeParticulars(s: string): string {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

export interface ParsedAmbeItem {
  sr: number;
  particulars: string;
  hsn: string;
  qty: number;
  rate: number;
  amount: number;
  matchedItem: string | null; // exact name from VEGETABLE_ITEMS, or null if unmapped
}

export interface ParsedAmbeBill {
  date: string | null; // YYYY-MM-DD
  invoiceNo: string | null;
  items: ParsedAmbeItem[];
  printedTotal: number | null;
}

function parseNum(s: string): number {
  return Number(s.replace(/,/g, ""));
}

export function parseAmbeBillText(text: string): ParsedAmbeBill {
  const items: ParsedAmbeItem[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(ITEM_BLOCK_RE);
  while ((m = re.exec(text)) !== null) {
    const [, hsn, sr, particularsRaw, qtyStr, , amountStr, rateWithTaxStr] = m;
    const particulars = normalizeParticulars(particularsRaw);
    items.push({
      sr: Number(sr),
      particulars,
      hsn,
      qty: parseNum(qtyStr),
      rate: parseNum(rateWithTaxStr),
      amount: parseNum(amountStr),
      matchedItem: AMBE_ITEM_MAP[particulars] && VEGETABLE_ITEMS.includes(AMBE_ITEM_MAP[particulars])
        ? AMBE_ITEM_MAP[particulars]
        : null,
    });
  }

  const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;

  const invoiceNoMatch = text.match(/(T\d{6}\/\d{4})/);
  const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1] : null;

  const totalMatch = text.match(/([\d,]+\.\d{2})\s*\n\s*[\d,]+\.\d{2}\s*\n\s*TOTAL\b/);
  const printedTotal = totalMatch ? parseNum(totalMatch[1]) : null;

  return { date, invoiceNo, items, printedTotal };
}
