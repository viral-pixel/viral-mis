import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { COMPLIANCE_SUBMODULE_SLUG, getEntityConfig, isRecordClosed } from "@/app/lib/complianceEntities";
import { parseUploadedSheet, excelValueToDate, excelValueToNumber } from "@/app/lib/excelIO";

// Matches by header LABEL (not column position), so an exported file from
// this same entity always round-trips correctly even if columns get
// reordered by hand in Excel. Rows are matched to fields case-insensitively
// and with whitespace trimmed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity: entitySlug } = await params;
  const entity = getEntityConfig(entitySlug);
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });

  const auth = await requireModuleAccessBySubModuleSlug(COMPLIANCE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const sheetRows = await parseUploadedSheet(file);
  if (sheetRows.length === 0) return NextResponse.json({ error: "No rows found in file" }, { status: 400 });

  // Map each field to whatever header text in the file matches its label.
  const sampleKeys = Object.keys(sheetRows[0]);
  const keyForField = new Map<string, string>();
  for (const f of entity.fields) {
    const match = sampleKeys.find((k) => k.trim().toLowerCase() === f.label.trim().toLowerCase());
    if (match) keyForField.set(f.key, match);
  }

  const importBatch = `import-${entitySlug}-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const model = (prisma as unknown as Record<string, { create: (args: unknown) => Promise<unknown> }>)[entity.model];

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    const data: Record<string, unknown> = { enteredBy: auth.session.username ?? "", importBatch };
    let hasAnyValue = false;

    for (const f of entity.fields) {
      const key = keyForField.get(f.key);
      const raw = key ? row[key] : undefined;
      if (f.key === "needsReminder") {
        data[f.key] = raw === undefined || raw === null || raw === "" ? true : /^(yes|true|1)$/i.test(String(raw).trim());
        continue;
      }
      if (f.type === "date") {
        data[f.key] = excelValueToDate(raw);
      } else if (f.type === "number") {
        data[f.key] = excelValueToNumber(raw);
      } else {
        data[f.key] = raw === undefined || raw === null ? "" : String(raw).trim();
        if (data[f.key]) hasAnyValue = true;
      }
    }

    if (!hasAnyValue) continue; // skip fully blank rows

    // Auto-apply the same closed-status reminder suggestion used by the form,
    // unless the file explicitly provided a "Send Reminders..." column.
    if (entity.closedStatusField && (!keyForField.has("needsReminder"))) {
      const statusVal = data[entity.closedStatusField.key];
      data.needsReminder = !isRecordClosed(entity, statusVal);
    }

    try {
      await model.create({ data });
      created++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ created, errors, importBatch });
}
