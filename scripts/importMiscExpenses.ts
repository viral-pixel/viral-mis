// One-off load of the user's real "Misc Data_NCS.xlsx" (2026-09-19), using the
// same parser as the in-app Upload button so the two can never disagree.
// Safe to re-run: months are upserted, not duplicated.
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { importMiscRows } from "../app/lib/miscExpensesImport";

const prisma = new PrismaClient();
const SOURCE_PATH = "C:/Users/HP/OneDrive/Desktop/Misc Data_NCS.xlsx";

async function main() {
  // cellDates stays off on purpose: SheetJS's own date conversion is off by a
  // day for some serials (see app/lib/excelIO.ts) — we convert ourselves.
  const wb = XLSX.readFile(SOURCE_PATH, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
  const result = await importMiscRows(prisma as never, records, "import", "misc-initial-2026-09-19");
  console.log(result);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
