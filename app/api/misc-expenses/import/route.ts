import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";
import { parseUploadedSheet } from "@/app/lib/excelIO";
import { importMiscRows } from "@/app/lib/miscExpensesImport";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an Excel file first" }, { status: 400 });

  let records: Record<string, unknown>[];
  try {
    records = await parseUploadedSheet(file);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a readable Excel file" }, { status: 400 });
  }
  if (records.length === 0) return NextResponse.json({ error: "The sheet has no rows" }, { status: 400 });

  const stamp = new Date().toISOString().slice(0, 10);
  const result = await importMiscRows(prisma, records, auth.session.username ?? "", `misc-upload-${stamp}`);
  if (result.created + result.updated === 0) {
    return NextResponse.json({ error: result.errors[0] ?? "No usable rows found — expected columns: Month, Amount, Remarks", ...result }, { status: 400 });
  }
  return NextResponse.json(result);
}
