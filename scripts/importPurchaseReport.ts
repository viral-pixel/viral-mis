// One-off import of the real Purchase Report_Ketan Format.xlsx workbook
// (Sheet1: one row per month, ~26 commodities each with an Amount and/or
// Quantity column). Reuses the same header-matching approach as
// app/api/purchase/import so this script and the in-app importer stay in
// sync — this is just the disk-file entry point for the initial seed.
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { PURCHASE_ITEMS } from "../app/lib/purchaseItems";
import { upsertMonthEntries } from "../app/lib/purchaseUpsert";

const prisma = new PrismaClient();
const FILE = "C:\\Users\\HP\\OneDrive\\Desktop\\AI\\Analysis Related\\Ketan Related\\Purchase Report_Ketan Format.xlsx";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function excelValueToDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function excelValueToNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

async function main() {
  const wb = XLSX.readFile(FILE, { cellDates: true });
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { defval: null });
  if (rows.length === 0) throw new Error("No rows found in Sheet1");

  const items = await prisma.purchaseItemCategory.findMany({ orderBy: { sortOrder: "asc" } });
  const itemDefByName = new Map(PURCHASE_ITEMS.map((d) => [d.name, d]));

  const sampleKeys = Object.keys(rows[0]);
  const findKey = (candidates: (string | undefined)[]) => {
    const normCandidates = candidates.filter(Boolean).map((c) => norm(c as string));
    return sampleKeys.find((k) => normCandidates.includes(norm(k)));
  };

  const monthKey = findKey(["Month"]);
  if (!monthKey) throw new Error('Could not find a "Month" column');

  const itemKeyMap = items.map((item) => {
    const def = itemDefByName.get(item.name);
    const amountKey = item.hasAmount ? findKey([def?.excelAmountHeader]) : undefined;
    const quantityKey = item.hasQuantity ? findKey([def?.excelQuantityHeader]) : undefined;
    return { item, amountKey, quantityKey };
  });

  let monthsImported = 0;
  for (const row of rows) {
    const monthDate = excelValueToDate(row[monthKey]);
    if (!monthDate) continue;

    const entries = itemKeyMap.map(({ item, amountKey, quantityKey }) => ({
      itemCategoryId: item.id,
      amount: amountKey ? excelValueToNumber(row[amountKey]) : null,
      quantity: quantityKey ? excelValueToNumber(row[quantityKey]) : null,
    }));

    await upsertMonthEntries(monthDate, entries, "import");
    monthsImported++;
    console.log(`${monthDate.toISOString().slice(0, 7)}: imported`);
  }

  console.log(`\nTotal months imported: ${monthsImported}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
