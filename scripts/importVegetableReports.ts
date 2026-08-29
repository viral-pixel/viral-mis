// One-off import of "Vegetable  With Potato & Onion_Ketan Format.xlsx"
// (20 sheets) into the Vegetable & Produce Purchase sub-module.
//
// Sheet layout, confirmed by direct inspection 2026-08-29:
// - 17 monthly sheets, either split by vendor ("Vegetable Jakir <Month>-YY"
//   / "Vegetable Raju <Month>-YY") from May-26 onward, or a single sheet
//   ("Vegetable <Month>-YY") before that when only one vendor was active.
//   Each has: col A = Sr No, col B = Item name (exactly items 1-70 of the
//   master list, in order, followed by summary rows to ignore), then
//   repeating 3-column day-blocks [Qty, Rate, Amt] with the date in row 1
//   of the block's first column.
// - "Potato & Onion": one row per purchase transaction.
// - "Vegitable " (daily ledger): only used here for its "Fruit & Cash
//   Purchase" and "Onion & Garlic Flakes" lump-sum columns — the ledger's
//   Potato/Onion columns are a rollup of the Potato & Onion sheet, not
//   independent data, so importing them too would double-count.
//
// Vendor attribution for monthly sheets: sheet name "Jakir"/"Raju" is used
// directly as the vendor name (matches how the user already refers to
// them). Single-vendor-era sheets (before the split) are attributed to
// "Jakir" as a placeholder — Vendor is a freely-editable master, so this
// is easy to rename/correct afterward if wrong.
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { VEGETABLE_ITEMS } from "../app/lib/vegetableItems";

const prisma = new PrismaClient();
const FILE = "C:\\Users\\HP\\OneDrive\\Desktop\\AI\\Analysis Related\\Ketan Related\\Vegetable  With Potato & Onion_Ketan Format.xlsx";
const IMPORT_BATCH = `import-vegetable-${new Date().toISOString().slice(0, 10)}`;

function excelDateToJs(serial: number): Date | null {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
}

const MONTH_NUM: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7,
  August: 8, September: 9, October: 10, November: 11, December: 12,
};

function parseSheetMonth(sheetName: string): { year: number; month: number } | null {
  const m = sheetName.match(/(January|February|March|April|May|June|July|August|September|October|November|December)-(\d{2})/);
  if (!m) return null;
  const monthNum = MONTH_NUM[m[1]];
  const year = 2000 + Number(m[2]);
  return { year, month: monthNum };
}

function vendorNameForSheet(sheetName: string): string {
  if (/jakir/i.test(sheetName)) return "Jakir";
  if (/raju/i.test(sheetName)) return "Raju";
  return "Jakir"; // single-vendor era placeholder, renamable later
}

async function main() {
  // Re-running this script (e.g. after the Sep/Nov-25 date-parsing fix,
  // 2026-08-29) must not duplicate the earlier partial run — clear
  // anything previously import-sourced first. Scoped to enteredBy="import"
  // so real hand-entered data is never touched.
  await prisma.vegetablePurchaseEntry.deleteMany({ where: { enteredBy: "import" } });
  await prisma.potatoOnionEntry.deleteMany({ where: { enteredBy: "import" } });
  await prisma.cashPurchaseEntry.deleteMany({ where: { enteredBy: "import" } });

  const wb = XLSX.readFile(FILE, { cellDates: false });

  // ---- Master items + vendors ----
  const itemRows = await prisma.vegetableItem.findMany();
  const itemIdByName = new Map(itemRows.map((i) => [i.name.trim().toLowerCase(), i.id]));

  const vendorNames = ["Jakir", "Raju"];
  const vendorIdByName = new Map<string, number>();
  for (const name of vendorNames) {
    const v = await prisma.vegetableVendor.upsert({ where: { name }, update: {}, create: { name } });
    vendorIdByName.set(name, v.id);
  }

  // ---- Monthly vegetable purchase sheets ----
  const monthlySheetNames = wb.SheetNames.filter((n) => /^Vegetable (Jakir |Raju )?[A-Za-z]+-\d{2}$/.test(n.trim()));
  console.log(`Found ${monthlySheetNames.length} monthly sheets.`);

  type EntryRow = { date: Date; itemId: number; vendorId: number; quantity: number; rate: number; amount: number; enteredBy: string; importBatch: string };
  let allVegEntries: EntryRow[] = [];

  for (const sheetName of monthlySheetNames) {
    const monthInfo = parseSheetMonth(sheetName);
    if (!monthInfo) { console.log(`  SKIP (couldn't parse month): ${sheetName}`); continue; }
    const vendorName = vendorNameForSheet(sheetName);
    const vendorId = vendorIdByName.get(vendorName)!;

    const ws = wb.Sheets[sheetName];
    const range = XLSX.utils.decode_range(ws["!ref"]!);
    const cell = (r: number, c: number) => ws[XLSX.utils.encode_cell({ r, c })];

    // Day-blocks: start at col index 2 (C), step 3. Almost every block's
    // date is a real Excel serial, but two sheets (Sep-25, Nov-25) have a
    // run of blocks where the date was typed as text instead, e.g.
    // "09-09-2025 Patel Vegetable" (caught 2026-08-29: a naive "stop at
    // the first non-numeric cell" approach silently truncated Sep-25 to
    // just 8 of its ~30 real days). Parse a leading DD-MM-YYYY out of text
    // cells and keep going; only the literal "Total Volume" cell — always
    // the actual last column — ends the block loop.
    const blocks: { col: number; date: Date }[] = [];
    for (let c = 2; c <= range.e.c; c += 3) {
      const dcell = cell(0, c);
      if (!dcell || dcell.v === undefined || dcell.v === "") continue;
      if (typeof dcell.v === "number") {
        const date = excelDateToJs(dcell.v);
        if (date) blocks.push({ col: c, date });
        continue;
      }
      const text = String(dcell.v);
      if (/^total volume/i.test(text.trim())) break;
      const m = text.match(/^(\d{2})-(\d{2})-(\d{4})/);
      if (m) {
        blocks.push({ col: c, date: new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))) });
      }
      // else: unrecognized text in a header cell — skip this one block
      // rather than guessing or aborting the whole sheet.
    }

    let sheetEntries = 0;
    for (let r = 2; r < 2 + VEGETABLE_ITEMS.length; r++) {
      const nameCell = cell(r, 1);
      const itemName = nameCell ? String(nameCell.v).trim() : "";
      const itemId = itemIdByName.get(itemName.toLowerCase());
      if (!itemId) continue; // trailing summary rows, or a name mismatch worth noticing separately

      for (const block of blocks) {
        const qtyCell = cell(r, block.col);
        const rateCell = cell(r, block.col + 1);
        const qty = qtyCell && typeof qtyCell.v === "number" ? qtyCell.v : null;
        const rate = rateCell && typeof rateCell.v === "number" ? rateCell.v : null;
        if (qty == null || rate == null || qty === 0) continue;

        allVegEntries.push({
          date: block.date, itemId, vendorId, quantity: qty, rate, amount: qty * rate,
          enteredBy: "import", importBatch: IMPORT_BATCH,
        });
        sheetEntries++;
      }
    }
    console.log(`  ${sheetName} -> vendor=${vendorName}, ${blocks.length} day-blocks, ${sheetEntries} entries`);
  }

  console.log(`\nTotal vegetable purchase entries to insert: ${allVegEntries.length}`);
  const CHUNK = 500;
  for (let i = 0; i < allVegEntries.length; i += CHUNK) {
    await prisma.vegetablePurchaseEntry.createMany({ data: allVegEntries.slice(i, i + CHUNK) });
  }
  console.log("Vegetable purchase entries inserted.");

  // ---- Potato & Onion register ----
  const poWs = wb.Sheets["Potato & Onion"];
  const poRange = XLSX.utils.decode_range(poWs["!ref"]!);
  const poCell = (r: number, c: number) => poWs[XLSX.utils.encode_cell({ r, c })];
  const poVendorIds = new Map<string, number>();
  type PORow = {
    billNo: string; billDate: Date; materialReceivedDate: string; vendorId: number | null;
    source: string; item: string; quantity: number | null; rate: number | null; amount: number | null;
    closingStockNote: string; enteredBy: string; importBatch: string;
  };
  const poEntries: PORow[] = [];

  for (let r = 1; r <= poRange.e.r; r++) {
    const billDateCell = poCell(r, 2);
    const itemCell = poCell(r, 6);
    if (!billDateCell || typeof billDateCell.v !== "number" || !itemCell || !itemCell.v) continue;
    const billDate = excelDateToJs(billDateCell.v);
    if (!billDate) continue;

    const vendorNameCell = poCell(r, 4);
    let vendorId: number | null = null;
    const vName = vendorNameCell ? String(vendorNameCell.v).trim() : "";
    if (vName) {
      if (!poVendorIds.has(vName.toLowerCase())) {
        const v = await prisma.vegetableVendor.upsert({ where: { name: vName }, update: {}, create: { name: vName } });
        poVendorIds.set(vName.toLowerCase(), v.id);
      }
      vendorId = poVendorIds.get(vName.toLowerCase())!;
    }

    const qtyCell = poCell(r, 7);
    const rateCell = poCell(r, 8);
    const stockCell = poCell(r, 10);
    const billNoCell = poCell(r, 1);
    const sourceCell = poCell(r, 5);
    const receivedCell = poCell(r, 3);
    const qty = qtyCell && typeof qtyCell.v === "number" ? qtyCell.v : null;
    const rate = rateCell && typeof rateCell.v === "number" ? rateCell.v : null;

    poEntries.push({
      billNo: billNoCell ? String(billNoCell.v).trim() : "",
      billDate,
      materialReceivedDate: receivedCell ? String(receivedCell.v).trim() : "",
      vendorId,
      source: sourceCell ? String(sourceCell.v).trim() : "",
      item: String(itemCell.v).trim(),
      quantity: qty,
      rate,
      amount: qty != null && rate != null ? qty * rate : null,
      closingStockNote: stockCell ? String(stockCell.v).trim() : "",
      enteredBy: "import",
      importBatch: IMPORT_BATCH,
    });
  }

  if (poEntries.length > 0) {
    await prisma.potatoOnionEntry.createMany({ data: poEntries });
  }
  console.log(`Potato & Onion entries inserted: ${poEntries.length}`);

  // ---- Fruit & Cash Purchase / Onion & Garlic Flakes (from daily ledger) ----
  const ledgerWs = wb.Sheets["Vegitable "];
  const ledgerRange = XLSX.utils.decode_range(ledgerWs["!ref"]!);
  const ledgerCell = (r: number, c: number) => ledgerWs[XLSX.utils.encode_cell({ r, c })];
  type CashRow = { date: Date; category: string; amount: number; enteredBy: string; importBatch: string };
  const cashEntries: CashRow[] = [];

  for (let r = 1; r <= ledgerRange.e.r; r++) {
    const dateCell = ledgerCell(r, 0);
    if (!dateCell || typeof dateCell.v !== "number") continue; // skips trailing "Average Per Day" summary rows
    const date = excelDateToJs(dateCell.v);
    if (!date) continue;

    const fruitCashCell = ledgerCell(r, 5); // col F
    const flakesCell = ledgerCell(r, 8); // col I
    if (fruitCashCell && typeof fruitCashCell.v === "number" && fruitCashCell.v !== 0) {
      cashEntries.push({ date, category: "Fruit & Cash Purchase", amount: fruitCashCell.v, enteredBy: "import", importBatch: IMPORT_BATCH });
    }
    if (flakesCell && typeof flakesCell.v === "number" && flakesCell.v !== 0) {
      cashEntries.push({ date, category: "Onion & Garlic Flakes", amount: flakesCell.v, enteredBy: "import", importBatch: IMPORT_BATCH });
    }
  }
  if (cashEntries.length > 0) {
    await prisma.cashPurchaseEntry.createMany({ data: cashEntries });
  }
  console.log(`Cash purchase entries inserted: ${cashEntries.length}`);

  console.log("\nDone. Import batch:", IMPORT_BATCH);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
