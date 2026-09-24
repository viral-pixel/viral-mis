// One-off import: Monthly Rent Related Sheet.xlsx -> RentParty master
// (2026-09-24). Only the master fields are imported (see the schema
// comment on RentParty for why the ~135 monthly history columns are left
// out — mixed text/number cells, and not what was actually asked for).
//
// Straight creates, no name-matching: several real landlords in the source
// share a first name (e.g. three distinct "Dimpleben" car-rent arrangements
// at different sites) — matching by partyName alone silently collapsed
// those into one row and lost the others on the first run. This script is
// for the one-off initial load into an empty table only; the ongoing
// Excel-upload route (app/api/monthly-rent/parties/import) does the
// name-matching re-upload behavior, which is a deliberate, separate action.
// Re-running this script WOULD duplicate rows — don't, unless the table's
// been cleared first.
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();
const SOURCE = "C:/Users/HP/OneDrive/Desktop/Monthly Rent Related Sheet.xlsx";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

async function main() {
  const wb = XLSX.readFile(SOURCE, { cellDates: false });
  const ws = wb.Sheets["Monthly Pay"];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  let created = 0, skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const partyName = str(r[1]);
    if (!partyName) { skipped++; continue; }

    const mobileNo = str(r[r.length - 2]);
    const status = str(r[r.length - 1]).toUpperCase() === "ACTIVE" ? "ACTIVE" : "NOT ACTIVE";

    await prisma.rentParty.create({
      data: {
        srNo: num(r[0]),
        partyName,
        siteName: str(r[2]),
        typeOfPay: str(r[3]),
        amount: num(r[4]),
        tdsDeduction: num(r[5]) ?? 0,
        netPay: num(r[6]),
        modeOfPay: str(r[7]),
        approxDateOfPay: str(r[8]),
        mobileNo,
        status,
        importBatch: "import-monthly-rent-2026-09-24",
        enteredBy: "import",
      },
    });
    created++;
  }

  console.log(`Rent parties: ${created} created, ${skipped} skipped (blank name).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
