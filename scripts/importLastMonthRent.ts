// One-off backfill: column "EO" (header "Sep-26") in Monthly Rent Related
// Sheet.xlsx is the source's most recent actual-payment column — populated
// only for the 13 currently ACTIVE parties, blank everywhere else. Imports
// it as a historical Closed RentPaymentEntry per party so "Last Month Paid"
// on the Payment Requests grid has real data instead of "—", and it counts
// toward the Payment History (FY) totals too (2026-09-24).
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();
const SOURCE = "C:/Users/HP/OneDrive/Desktop/Monthly Rent Related Sheet.xlsx";
const RENT_MONTH = new Date(Date.UTC(2026, 8, 1)); // Sep-26
const DATE_PAID = new Date(Date.UTC(2026, 8, 30));

async function main() {
  const wb = XLSX.readFile(SOURCE, { cellDates: false });
  const ws = wb.Sheets["Monthly Pay"];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  const parties = await prisma.rentParty.findMany();
  const byName = new Map(parties.map((p) => [p.partyName.trim().toLowerCase(), p]));

  const existingBatch = await prisma.rentPaymentEntry.count({ where: { remarksAdmin: { contains: "Imported from source sheet — Sep-26 actual" } } });
  if (existingBatch > 0) {
    console.log(`Already imported (${existingBatch} rows found) — skipping. Delete them first to re-run.`);
    await prisma.$disconnect();
    return;
  }

  let created = 0, skippedNoParty = 0, skippedBlank = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const partyName = String(r[1] ?? "").trim();
    if (!partyName) continue;
    const eo = r[144]; // column EO, "Sep-26"
    if (typeof eo !== "number") { skippedBlank++; continue; }

    const party = byName.get(partyName.toLowerCase());
    if (!party) { skippedNoParty++; console.log("No matching party for:", partyName); continue; }

    await prisma.rentPaymentEntry.create({
      data: {
        partyId: party.id,
        rentMonth: RENT_MONTH,
        dueDate: DATE_PAID,
        proposedAmount: eo,
        remarksRequester: "",
        raisedBy: "import",
        raisedByName: "Imported",
        status: "Closed",
        paidAmount: eo,
        datePaid: DATE_PAID,
        remarksAdmin: "Imported from source sheet — Sep-26 actual (column EO)",
        paidBy: "Import",
        closedAt: DATE_PAID,
      },
    });
    created++;
  }

  console.log(`Created ${created} historical payment entries. Skipped: ${skippedBlank} blank, ${skippedNoParty} no matching party.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
