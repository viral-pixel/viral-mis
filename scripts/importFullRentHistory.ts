// One-off: import the FULL historical monthly payment matrix from Monthly
// Rent Related Sheet.xlsx — every numeric cell in columns J (index 9,
// 2015-06) through EO (index 144, 2026-09), for EVERY party including NOT
// ACTIVE ones, "to have a consolidated analysis" (2026-09-24, user's
// explicit instruction). Cells holding text ("Paid", "CLOSE", "HOLD",
// "PEN", "NA", etc.) are skipped per the user's own rule — only real
// numbers count. Row 106 (blank party name) is a totals row, not a party,
// and is skipped exactly as the original party import already did.
//
// Supersedes importLastMonthRent.ts's narrower Sep-26-only backfill — that
// batch is deleted first so this one becomes the single source for
// historical figures instead of the two overlapping.
//
// Matches file rows to already-imported RentParty rows by POSITION (both
// created/read in the same original file order), not by name — several
// parties share a first name (e.g. three distinct "Dimpleben" entries), so
// name-matching would misassign rows the same way the original party
// import's first, buggy attempt did.
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();
const SOURCE = "C:/Users/HP/OneDrive/Desktop/Monthly Rent Related Sheet.xlsx";
const FIRST_MONTH_COL = 9;
const LAST_MONTH_COL = 144;
const IMPORT_BATCH = "import-rent-history-2026-09-24";

function monthFromSerial(serial: number): Date | null {
  const p = XLSX.SSF.parse_date_code(serial);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.m - 1, 1));
}
function lastDayOfMonth(monthStart: Date): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
}

async function main() {
  const wb = XLSX.readFile(SOURCE, { cellDates: false });
  const ws = wb.Sheets["Monthly Pay"];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  const header = rows[0];

  const monthCols: { col: number; month: Date }[] = [];
  for (let c = FIRST_MONTH_COL; c <= LAST_MONTH_COL; c++) {
    const m = typeof header[c] === "number" ? monthFromSerial(header[c] as number) : null;
    if (m) monthCols.push({ col: c, month: m });
  }
  console.log(`Resolved ${monthCols.length} month columns: ${monthCols[0].month.toISOString().slice(0, 7)} .. ${monthCols[monthCols.length - 1].month.toISOString().slice(0, 7)}`);

  // Clear anything from a previous run of this script or the narrower
  // Sep-26-only backfill, so re-running never duplicates rows.
  const deletedOld = await prisma.rentPaymentEntry.deleteMany({
    where: { OR: [{ remarksAdmin: { contains: IMPORT_BATCH } }, { remarksAdmin: { contains: "Imported from source sheet — Sep-26 actual" } }] },
  });
  console.log(`Cleared ${deletedOld.count} rows from earlier import runs.`);

  // Same order the parties were created in originally (see
  // importMonthlyRent.ts) — id ascending within that batch.
  const parties = await prisma.rentParty.findMany({
    where: { importBatch: "import-monthly-rent-2026-09-24" },
    orderBy: { id: "asc" },
  });
  console.log(`Found ${parties.length} previously-imported parties to line up against.`);

  let partyCursor = 0;
  let entriesCreated = 0;
  const toCreate: {
    partyId: number; rentMonth: Date; dueDate: Date; basicPay: number; gst: number; tds: number;
    extraPay: number; extraDedn: number; proposedAmount: number; remarksRequester: string;
    raisedBy: string; raisedByName: string; status: string; paidAmount: number; datePaid: Date;
    remarksAdmin: string; paidBy: string; closedAt: Date;
  }[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const partyName = String(row[1] ?? "").trim();
    if (!partyName) continue; // row 106: totals row, not a party

    const party = parties[partyCursor];
    partyCursor++;
    if (!party) { console.error(`No RentParty left to match file row ${r + 1} ("${partyName}") — party count mismatch, aborting.`); process.exit(1); }
    if (party.partyName.toLowerCase() !== partyName.toLowerCase()) {
      // Names should match 1:1 in order (case-insensitive; title-casing may
      // differ) — if they don't, the position-based zip has drifted, and
      // it's safer to stop than to silently misassign historical money.
      console.error(`Row ${r + 1} name "${partyName}" doesn't match expected party "${party.partyName}" (id ${party.id}) — aborting before any writes.`);
      process.exit(1);
    }

    for (const { col, month } of monthCols) {
      const v = row[col];
      if (typeof v !== "number") continue; // text ("Paid"/"CLOSE"/etc.) or blank — skip per the user's rule
      const dt = lastDayOfMonth(month);
      toCreate.push({
        partyId: party.id,
        rentMonth: month,
        dueDate: dt,
        basicPay: v, gst: 0, tds: 0, extraPay: 0, extraDedn: 0,
        proposedAmount: v,
        remarksRequester: "",
        raisedBy: "import",
        raisedByName: "Imported",
        status: "Closed",
        paidAmount: v,
        datePaid: dt,
        remarksAdmin: `${IMPORT_BATCH}: historical figure from source sheet`,
        paidBy: "Import",
        closedAt: dt,
      });
      entriesCreated++;
    }
  }

  if (partyCursor !== parties.length) {
    console.error(`Matched ${partyCursor} file rows but had ${parties.length} parties — mismatch, aborting before writes.`);
    process.exit(1);
  }

  console.log(`Prepared ${toCreate.length} historical payment rows across ${partyCursor} parties. Writing...`);
  const CHUNK = 500;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    await prisma.rentPaymentEntry.createMany({ data: toCreate.slice(i, i + CHUNK) });
    console.log(`  ...${Math.min(i + CHUNK, toCreate.length)}/${toCreate.length}`);
  }

  console.log(`Done. Created ${entriesCreated} historical payment entries.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
