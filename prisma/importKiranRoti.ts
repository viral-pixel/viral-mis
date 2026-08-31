// One-off historical backfill: imports every sheet of the user's real
// "Kiran_Roti Details.xlsx" (one sheet per month, e.g. "Sep-25") into
// RotiDayEntry/RotiLineItem. Not wired into the app UI — run directly via
// `npx tsx prisma/importKiranRoti.ts`.
//
// The column layout is NOT fixed across sheets: site names, their column
// order, and even which categories a site tracks (e.g. Lumax is Roti-only
// in some months, full 4-category in others) all change month to month —
// confirmed by inspecting all 12 sheets directly. So instead of assuming
// fixed column offsets, this walks each sheet's own 3-row header (Site ->
// Meal -> Category) to build a per-sheet column map, the same way a human
// reading the sheet would.
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { excelValueToDate } from "../app/lib/excelIO";

const prisma = new PrismaClient();
const FILE_PATH = "C:/Users/HP/OneDrive/Desktop/Kiran_Roti Details.xlsx";

// Every raw site header text seen across all 12 sheets, mapped to the exact
// RotiSite name already seeded (app/lib/rotiMeta.ts). "Intas" -> "Intas
// Matoda" per the user's explicit instruction. Anything not in this table
// throws loudly rather than being silently dropped.
const SITE_ALIASES: Record<string, string> = {
  "intas": "Intas Matoda",
  "intas sez": "Intas SEZ",
  "ibpl": "IBPL",
  "finnar": "Finar",
  "finar": "Finar",
  "o2h": "O2H",
  "inox": "INOX",
  "veeglow": "Veeglow",
  "unison": "Unison",
  "ttec": "TTEC",
  "central kitchen": "Central Kitchen",
  "laundry": "Laundry",
  "lumax": "Lumax",
};

function normalizeSite(raw: string): string | null {
  return SITE_ALIASES[raw.trim().toLowerCase()] ?? null;
}
function normalizeMeal(raw: string): string | null {
  const k = raw.trim().toLowerCase();
  if (k.startsWith("lunch")) return "Lunch";
  if (k.startsWith("din")) return "Dinner"; // covers "Dinner" and the "Dinnar" typo seen in several sheets
  return null;
}
function normalizeCategory(raw: string): string | null {
  const k = raw.trim().toLowerCase();
  if (k.startsWith("roti")) return "Roti";
  if (k.startsWith("parath")) return "Paratha";
  if (k.startsWith("poori")) return "Poori";
  if (k.startsWith("thepla")) return "Thepla";
  return null;
}

interface ColumnMapping {
  col: number;
  site: string;
  meal: string;
  category: string;
}

function cellText(ws: XLSX.WorkSheet, r: number, c: number): string | null {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  if (!cell || cell.v == null || String(cell.v).trim() === "") return null;
  return String(cell.v).trim();
}

// Reads the 3-row header (Site / Meal / Category) and returns one entry per
// data column, plus the Remark column index if this sheet has one (several
// of the older sheets don't).
function buildColumnMap(ws: XLSX.WorkSheet, sheetName: string, lastCol: number) {
  const row1: { col: number; text: string }[] = [];
  for (let c = 1; c <= lastCol; c++) {
    const t = cellText(ws, 0, c);
    if (t) row1.push({ col: c, text: t });
  }

  let remarkCol: number | null = null;
  const siteHeaders = row1.filter((h) => {
    if (/^remark/i.test(h.text)) { remarkCol = h.col; return false; }
    return true;
  });
  const sitesAreaEnd = remarkCol != null ? remarkCol : lastCol + 1;

  const columnMap: ColumnMapping[] = [];
  for (let i = 0; i < siteHeaders.length; i++) {
    const site = siteHeaders[i];
    const siteEndCol = (i + 1 < siteHeaders.length ? siteHeaders[i + 1].col : sitesAreaEnd) - 1;
    const canonicalSite = normalizeSite(site.text);
    if (!canonicalSite) throw new Error(`[${sheetName}] Unrecognized site header "${site.text}" at column ${site.col}`);

    const mealHeaders: { col: number; text: string }[] = [];
    for (let c = site.col; c <= siteEndCol; c++) {
      const t = cellText(ws, 1, c);
      if (t) mealHeaders.push({ col: c, text: t });
    }
    for (let j = 0; j < mealHeaders.length; j++) {
      const meal = mealHeaders[j];
      const mealEndCol = (j + 1 < mealHeaders.length ? mealHeaders[j + 1].col : siteEndCol + 1) - 1;
      const canonicalMeal = normalizeMeal(meal.text);
      if (!canonicalMeal) throw new Error(`[${sheetName}] Unrecognized meal header "${meal.text}" at column ${meal.col} (site ${site.text})`);

      for (let c = meal.col; c <= mealEndCol; c++) {
        const catRaw = cellText(ws, 2, c);
        if (!catRaw) continue;
        const canonicalCat = normalizeCategory(catRaw);
        if (!canonicalCat) throw new Error(`[${sheetName}] Unrecognized category header "${catRaw}" at column ${c} (site ${site.text}, meal ${meal.text})`);
        columnMap.push({ col: c, site: canonicalSite, meal: canonicalMeal, category: canonicalCat });
      }
    }
  }
  return { columnMap, remarkCol: remarkCol as number | null };
}

interface ParsedDay {
  date: Date;
  remarks: string;
  lines: { site: string; meal: string; category: string; quantity: number }[];
}
interface SkippedRow {
  sheet: string;
  row: number;
  raw: unknown;
  reason: string;
}

// Sheet name like "Sep-25" -> "2025-09", used to sanity-check every date
// found in that sheet actually belongs to that month. This is what catches
// the Sep-25 sheet's two bad rows (a duplicate Oct-1 row and a garbled
// "02-010-2025" text date) without needing to special-case that sheet.
function sheetMonthKey(sheetName: string): string {
  const [monAbbr, yy] = sheetName.split("-");
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const m = months.indexOf(monAbbr.toLowerCase());
  if (m === -1) throw new Error(`Can't parse month from sheet name "${sheetName}"`);
  const year = 2000 + Number(yy);
  return `${year}-${String(m + 1).padStart(2, "0")}`;
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): { days: ParsedDay[]; skipped: SkippedRow[] } {
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  const { columnMap, remarkCol } = buildColumnMap(ws, sheetName, range.e.c);
  const monthKey = sheetMonthKey(sheetName);

  const days: ParsedDay[] = [];
  const skipped: SkippedRow[] = [];

  for (let r = 3; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    if (!dateCell || dateCell.v == null || dateCell.v === "") continue;
    if (typeof dateCell.v === "string" && /total/i.test(dateCell.v)) break;

    const date = excelValueToDate(dateCell.v);
    if (!date) {
      skipped.push({ sheet: sheetName, row: r + 1, raw: dateCell.v, reason: "Could not parse as a date" });
      continue;
    }
    const dm = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (dm !== monthKey) {
      skipped.push({ sheet: sheetName, row: r + 1, raw: dateCell.v, reason: `Parsed as ${date.toISOString().slice(0, 10)}, which isn't in ${sheetName} — looks misplaced` });
      continue;
    }

    const lines: ParsedDay["lines"] = [];
    for (const m of columnMap) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: m.col })];
      const v = cell ? cell.v : null;
      if (v == null || v === "") continue;
      const n = Number(v);
      if (isNaN(n) || n === 0) continue;
      lines.push({ site: m.site, meal: m.meal, category: m.category, quantity: n });
    }
    let remarks = "";
    if (remarkCol != null) {
      const rc = ws[XLSX.utils.encode_cell({ r, c: remarkCol })];
      remarks = rc && rc.v != null ? String(rc.v).trim() : "";
    }
    days.push({ date, remarks, lines });
  }
  return { days, skipped };
}

async function main() {
  const wb = XLSX.readFile(FILE_PATH, { cellDates: false });

  const [sites, mealTypes, categories] = await Promise.all([
    prisma.rotiSite.findMany(),
    prisma.rotiMealType.findMany(),
    prisma.rotiCategory.findMany(),
  ]);
  const siteId = new Map(sites.map((s) => [s.name, s.id]));
  const mealTypeId = new Map(mealTypes.map((m) => [m.name, m.id]));
  const categoryId = new Map(categories.map((c) => [c.name, c.id]));

  let allDays: (ParsedDay & { sheet: string })[] = [];
  let allSkipped: SkippedRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const { days, skipped } = parseSheet(ws, sheetName);
    allDays = allDays.concat(days.map((d) => ({ ...d, sheet: sheetName })));
    allSkipped = allSkipped.concat(skipped);
  }

  // Sanity: no two sheets should produce the same date (would mean a
  // cross-month mixup slipped past the per-sheet month check).
  const byDate = new Map<string, (ParsedDay & { sheet: string })[]>();
  for (const d of allDays) {
    const key = d.date.toISOString().slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), d]);
  }
  const dupes = [...byDate.entries()].filter(([, arr]) => arr.length > 1);

  console.log(`Parsed ${allDays.length} day-rows across ${wb.SheetNames.length} sheets.`);
  console.log(`Skipped ${allSkipped.length} row(s):`);
  for (const s of allSkipped) console.log(`  [${s.sheet}] row ${s.row}: raw=${JSON.stringify(s.raw)} — ${s.reason}`);
  if (dupes.length > 0) {
    console.log(`ABORTING — ${dupes.length} date(s) appear in more than one sheet:`);
    for (const [date, arr] of dupes) console.log(`  ${date}: ${arr.map((d) => d.sheet).join(", ")}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  let totalLines = 0;
  let grandTotalQty = 0;
  for (const day of allDays) {
    const dbLines = day.lines.map((l) => ({
      siteId: siteId.get(l.site)!,
      mealTypeId: mealTypeId.get(l.meal)!,
      categoryId: categoryId.get(l.category)!,
      quantity: l.quantity,
    }));
    totalLines += dbLines.length;
    grandTotalQty += dbLines.reduce((s, l) => s + l.quantity, 0);

    // No $transaction wrapper — each day's writes are independent of every
    // other day, and wrapping 361 of them in interactive transactions over
    // a remote connection exhausted Prisma's transaction pool (P2028:
    // "Unable to start a transaction in the given time") partway through
    // the first run. Safe to just run sequentially: re-running this script
    // is idempotent (upsert by date, delete-then-recreate lines), so a
    // crash mid-way just means re-run.
    const existing = await prisma.rotiDayEntry.findUnique({ where: { date: day.date } });
    const dayEntry = existing
      ? await prisma.rotiDayEntry.update({ where: { id: existing.id }, data: { remarks: day.remarks, enteredBy: "import:Kiran_Roti Details.xlsx" } })
      : await prisma.rotiDayEntry.create({ data: { date: day.date, remarks: day.remarks, enteredBy: "import:Kiran_Roti Details.xlsx" } });
    await prisma.rotiLineItem.deleteMany({ where: { dayEntryId: dayEntry.id } });
    if (dbLines.length > 0) {
      await prisma.rotiLineItem.createMany({ data: dbLines.map((l) => ({ ...l, dayEntryId: dayEntry.id })) });
    }
  }

  console.log(`\nImported ${allDays.length} days, ${totalLines} line items, grand total quantity = ${grandTotalQty.toLocaleString("en-IN")}.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
