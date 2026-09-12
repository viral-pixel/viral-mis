// One-off historical import of the real "Vendor Payment_NCS" Excel register
// (2026-09-12). Every imported row is marked Closed — per the user's
// explicit instruction, everything in this file is to be treated as already
// paid, regardless of what the source's own Open/Clear/Close status columns
// say (data before this migration point is a closed book; the app is the
// system of record going forward).
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SOURCE_PATH = "C:/Users/HP/OneDrive/Desktop/Temp Download/Vendor Payment_NCS_11 09 2026.xlsx";
const IMPORT_BATCH = "vendor-payment-2026-09-12";

function toCleanDate(v: unknown): Date | null {
  if (!(v instanceof Date)) return null;
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
}
function toNum(v: unknown): number | null {
  if (v === "" || v == null) return null;
  // A handful of source rows have a stray date typed into an amount column
  // (data-entry mistake) — Number(aDate) silently returns its epoch
  // milliseconds instead of NaN, which would otherwise corrupt every sum
  // that touches this row. Reject Date values outright instead.
  if (v instanceof Date) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function normPaymentType(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "cheque" ? "Cheque" : "NEFT";
}

async function main() {
  const wb = XLSX.readFile(SOURCE_PATH, { cellDates: true });
  const ws = wb.Sheets["Vendor Payment Sheet"];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  // Real data rows only: numeric Sr. No. + non-blank Vendor Name — this
  // drops the trailing "Bank Details / Account No. / IFSC Code" footer
  // block and any stray blank rows (per the user's "ignore blank rows").
  const data = rows.slice(1).filter((r) => typeof r[0] === "number" && r[1] && String(r[1]).trim() !== "");

  let lastKnownDate: Date | null = null;
  let created = 0;
  let skippedNoAmount = 0;
  const toInsert: Parameters<typeof prisma.vendorPaymentEntry.create>[0]["data"][] = [];

  for (const r of data) {
    const vendorName = String(r[1]).trim();
    const vendorType = String(r[2] ?? "").trim();
    const bankName = String(r[3] ?? "").trim() || vendorName;
    const outstandingAmount = toNum(r[4]);
    const proposedAmount = toNum(r[5]);
    const approvedAmountRaw = toNum(r[7]);
    let proposedDate = toCleanDate(r[6]);
    const datePaidRaw = toCleanDate(r[8]);
    const paymentType = normPaymentType(r[10]);
    const contactRaw = r[13];
    const contactDetails = contactRaw === "" || contactRaw == null ? "" : String(contactRaw).trim();

    // Amount is the one thing we can't reasonably invent — 5 rows in the
    // whole sheet have no proposed amount, no approved amount, AND no
    // outstanding figure to fall back on. Skip those (ignore, per the
    // user's "wherever blank cells are seen, ignore them").
    const amount = proposedAmount ?? approvedAmountRaw ?? outstandingAmount;
    if (amount == null) { skippedNoAmount++; continue; }

    // Missing proposed date -> nearest date, per the user's explicit
    // instruction. The sheet is laid out in date-ascending batches, so the
    // most recently seen real date is the correct "nearby" fill.
    if (!proposedDate) proposedDate = datePaidRaw ?? lastKnownDate;
    if (proposedDate) lastKnownDate = proposedDate;
    if (!proposedDate) continue; // never happens given the sheet, but keeps types honest

    // Treat everything as already paid: approvedAmount defaults to the
    // amount actually used, datePaid defaults to the proposed date when the
    // source left it blank (~48% of rows) — both per the user's explicit
    // "consider everything paid till now" instruction.
    const approvedAmount = approvedAmountRaw ?? amount;
    const datePaid = datePaidRaw ?? proposedDate;

    toInsert.push({
      vendorName, vendorType, bankName, contactDetails,
      outstandingAmount, amount, paymentDate: proposedDate, paymentType,
      approvedAmount, datePaid, urgency: "Normal", status: "Closed",
      remarksFinance: "", remarksAdmin: "",
      enteredBy: "import", importBatch: IMPORT_BATCH,
    });
  }

  console.log(`Prepared ${toInsert.length} rows to insert, skipped ${skippedNoAmount} with no amount anywhere.`);

  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    const res = await prisma.vendorPaymentEntry.createMany({ data: chunk });
    created += res.count;
    console.log(`Inserted ${created}/${toInsert.length}...`);
  }

  console.log(`Done. Imported ${created} historical Vendor Payment entries, batch="${IMPORT_BATCH}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
