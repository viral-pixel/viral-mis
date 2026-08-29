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
// the header row's cell text (trimmed). `raw: true` + our own date-serial
// handling below avoids the "cellDates:true still leaks raw serials on
// inconsistently-formatted cells" bug hit during the original Ketan import
// (see scripts/importKetanCompliance.ts) — every consumer gets the fix
// automatically instead of re-discovering it.
export async function parseUploadedSheet(file: File): Promise<Record<string, unknown>[]> {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// Converts a raw cell value into a real Date, whether SheetJS already gave
// us one or left a bare Excel day-serial number (inconsistent cell
// formatting in the source file — same root cause documented in
// scripts/importKetanCompliance.ts).
export function excelValueToDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" && v.trim().toUpperCase() === "NA") return null;
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)));
  }
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

export function excelValueToNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
