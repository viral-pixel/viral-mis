import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";
import { parseUploadedSheet, excelValueToDate, excelValueToNumber } from "@/app/lib/excelIO";

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Accepts this module's own export format (Month, Commodity Group,
// Amount, Quantity, Deduction, Remarks) — one row per transaction, matched
// to an existing group by name.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const sheetRows = await parseUploadedSheet(file);
  if (sheetRows.length === 0) return NextResponse.json({ error: "No rows found in file" }, { status: 400 });

  const groups = await prisma.purchaseGroup.findMany();
  const groupByName = new Map(groups.map((g) => [norm(g.name), g]));

  const sampleKeys = Object.keys(sheetRows[0]);
  const findKey = (label: string) => sampleKeys.find((k) => norm(k) === norm(label));
  const monthKey = findKey("Month");
  const groupKey = findKey("Commodity Group");
  const subItemKey = findKey("Item");
  const amountKey = findKey("Amount");
  const quantityKey = findKey("Quantity");
  const deductionKey = findKey("Deduction (Yes/No)");
  const remarksKey = findKey("Remarks");

  if (!monthKey || !groupKey) {
    return NextResponse.json({ error: 'File must have "Month" and "Commodity Group" columns' }, { status: 400 });
  }

  const importBatch = `import-purchase-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    const monthDate = excelValueToDate(row[monthKey]);
    const groupName = row[groupKey] ? String(row[groupKey]).trim() : "";
    if (!monthDate || !groupName) continue;

    const group = groupByName.get(norm(groupName));
    if (!group) {
      errors.push(`Row ${i + 2}: unknown commodity group "${groupName}"`);
      continue;
    }

    try {
      await prisma.purchaseEntry.create({
        data: {
          month: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1)),
          groupId: group.id,
          amount: amountKey ? excelValueToNumber(row[amountKey]) : null,
          quantity: quantityKey ? excelValueToNumber(row[quantityKey]) : null,
          isDeduction: deductionKey ? /^(yes|true|1)$/i.test(String(row[deductionKey] ?? "").trim()) : false,
          subItem: subItemKey ? String(row[subItemKey] ?? "").trim() : "",
          remarks: remarksKey ? String(row[remarksKey] ?? "").trim() : "",
          enteredBy: auth.session.username ?? "",
          importBatch,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ created, errors });
}
