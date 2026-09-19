// Shared by the upload API and the one-off seed script, so both parse the
// Excel identically. Deliberately takes the Prisma client as an argument and
// imports nothing path-aliased, so a plain tsx script can use it too.
import { excelValueToDate, excelValueToNumber } from "./excelIO";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Month cell is normally an Excel date (a serial number), but tolerate typed
// text like "Apr-2025" / "April 2025" too.
function parseMonth(v: unknown): Date | null {
  let d: Date | null = null;
  if (typeof v === "string") {
    const m = v.trim().match(/^([A-Za-z]{3,9})[\s\-'\/]*(\d{2,4})$/);
    if (m) {
      const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
      let y = Number(m[2]);
      if (y < 100) y += 2000;
      if (mi >= 0) d = new Date(Date.UTC(y, mi, 1));
    }
  }
  if (!d) d = excelValueToDate(v);
  if (!d || isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function parseAmount(v: unknown): number | null {
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    return cleaned === "" ? null : Number(cleaned);
  }
  return excelValueToNumber(v);
}

function pick(row: Record<string, unknown>, pattern: RegExp): unknown {
  const key = Object.keys(row).find((k) => pattern.test(k.trim()));
  return key === undefined ? null : row[key];
}

interface PrismaLike {
  miscExpense: {
    findUnique: (a: { where: { month: Date } }) => Promise<unknown | null>;
    upsert: (a: {
      where: { month: Date };
      update: { amount: number; remarks: string; enteredBy: string; importBatch: string };
      create: { month: Date; amount: number; remarks: string; enteredBy: string; importBatch: string };
    }) => Promise<unknown>;
  };
}

export async function importMiscRows(
  prisma: PrismaLike,
  records: Record<string, unknown>[],
  enteredBy: string,
  importBatch: string
) {
  let created = 0, updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rawMonth = pick(row, /^month/i);
    const rawAmount = pick(row, /^amount/i);
    const rawRemarks = pick(row, /^remark/i);
    const line = i + 2; // header is row 1

    // Skip fully blank rows quietly.
    if ((rawMonth == null || rawMonth === "") && (rawAmount == null || rawAmount === "") && (rawRemarks == null || rawRemarks === "")) continue;

    const month = parseMonth(rawMonth);
    const amount = parseAmount(rawAmount);
    if (!month) { errors.push(`Row ${line}: could not read the Month`); continue; }
    if (amount == null || isNaN(amount)) { errors.push(`Row ${line}: could not read the Amount`); continue; }

    const remarks = String(rawRemarks ?? "").replace(/\r\n?/g, "\n").trim();
    const existed = await prisma.miscExpense.findUnique({ where: { month } });
    await prisma.miscExpense.upsert({
      where: { month },
      update: { amount, remarks, enteredBy, importBatch },
      create: { month, amount, remarks, enteredBy, importBatch },
    });
    if (existed) updated++; else created++;
  }
  return { created, updated, errors };
}
