import * as XLSX from "xlsx";

// Shared building blocks for every module's Excel export/import — kept
// generic so future sub-modules get import/export for free instead of
// each one reinventing it.

export function buildXlsxResponseBuffer(sheetName: string, headers: string[], rows: (string | number | null)[][]): Buffer {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function xlsxDownloadHeaders(filename: string) {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}

// Reads an uploaded file's first sheet as an array of row-objects keyed by
// the header row's cell text (trimmed). Deliberately does NOT pass
// `cellDates: true` — SheetJS's own auto-conversion of a numeric date
// serial into a JS Date is measurably wrong (verified against a real cell:
// serial 45658 is "01-01-2025" per Excel's own formula bar and per
// `XLSX.SSF.parse_date_code(45658)`, but `cellDates: true` turns that same
// serial into `2024-12-31T18:29:50Z` — a different day, plus a bogus
// time-of-day). Leaving cells as raw numbers and converting them ourselves
// via `excelValueToDate` (which uses parse_date_code, the path proven
// correct) avoids that bug entirely instead of working around its symptoms.
export async function parseUploadedSheet(file: File): Promise<Record<string, unknown>[]> {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

// Converts a raw cell value into a real Date. Numeric Excel day-serials go
// through XLSX.SSF.parse_date_code — verified correct against Excel's own
// formula-bar value (see note on parseUploadedSheet above). Do NOT special
// case `v instanceof Date` as "already correct" — if a Date object reaches
// here, it came from SheetJS's own buggy auto-conversion.
export function excelValueToDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string" && v.trim().toUpperCase() === "NA") return null;
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)));
  }
  if (v instanceof Date) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

export function excelValueToNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
