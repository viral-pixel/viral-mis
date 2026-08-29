import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";
import { parseUploadedSheet, excelValueToNumber } from "@/app/lib/excelIO";

// Count L/D is the only figure in this whole dashboard that's actually
// typed in by hand — everything else is derived from Ketan's data. This
// lets Viral bulk-load many months at once (e.g. re-importing his own
// "Count L/D" column) instead of using the inline per-month editor for
// each one individually.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const rows = await parseUploadedSheet(file);
  if (rows.length === 0) return NextResponse.json({ error: "No rows found in the uploaded file" }, { status: 400 });

  const keys = Object.keys(rows[0]);
  const norm = (s: string) => s.trim().toLowerCase();
  const find = (label: string) => keys.find((k) => norm(k) === norm(label));
  const monthKey = find("Month");
  const countKey = find("Count L/D") ?? find("Count L / D");
  if (!monthKey || !countKey) {
    return NextResponse.json({ error: 'Expected columns "Month" (YYYY-MM) and "Count L/D"' }, { status: 400 });
  }

  let updated = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const month = String(row[monthKey] ?? "").trim();
    const count = excelValueToNumber(row[countKey]);
    if (!month) continue;
    if (!/^\d{4}-\d{2}$/.test(month)) { errors.push(`Row ${i + 2}: "${month}" is not in YYYY-MM format`); continue; }
    if (count == null || count < 0) { errors.push(`Row ${i + 2} (${month}): Count L/D missing or invalid`); continue; }
    await prisma.monthlyMealCount.upsert({
      where: { monthKey: month },
      create: { monthKey: month, countLD: Math.round(count), enteredBy: auth.session.username ?? "" },
      update: { countLD: Math.round(count), enteredBy: auth.session.username ?? "" },
    });
    updated++;
  }

  return NextResponse.json({ updated, errors });
}
