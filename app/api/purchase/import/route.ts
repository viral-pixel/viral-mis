import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG, PURCHASE_ITEMS } from "@/app/lib/purchaseItems";
import { parseUploadedSheet, excelValueToDate, excelValueToNumber } from "@/app/lib/excelIO";
import { upsertMonthEntries } from "@/app/lib/purchaseUpsert";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Accepts EITHER this app's own export (headers like "Oil Amount",
// "Oil (Tin)") OR the user's original real-world Purchase Report Excel
// (headers like "Oil Bill Amount", "Oil Tin Purchase") — both are
// registered as candidate header texts per item below, so re-uploading a
// file exported from here, or the source workbook itself, both work.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const sheetRows = await parseUploadedSheet(file);
  if (sheetRows.length === 0) return NextResponse.json({ error: "No rows found in file" }, { status: 400 });

  const items = await prisma.purchaseItemCategory.findMany({ orderBy: { sortOrder: "asc" } });
  const itemDefByName = new Map(PURCHASE_ITEMS.map((d) => [d.name, d]));

  const sampleKeys = Object.keys(sheetRows[0]);
  const findKey = (candidates: (string | undefined)[]) => {
    const normCandidates = candidates.filter(Boolean).map((c) => norm(c as string));
    return sampleKeys.find((k) => normCandidates.includes(norm(k)));
  };

  const monthKey = findKey(["Month"]);
  if (!monthKey) return NextResponse.json({ error: 'Could not find a "Month" column in the file' }, { status: 400 });

  const itemKeyMap = items.map((item) => {
    const def = itemDefByName.get(item.name);
    const amountKey = item.hasAmount ? findKey([def?.excelAmountHeader, `${item.name} Amount`]) : undefined;
    const quantityKey = item.hasQuantity ? findKey([def?.excelQuantityHeader, `${item.name} (${item.unit})`]) : undefined;
    return { item, amountKey, quantityKey };
  });

  let monthsImported = 0;
  const errors: string[] = [];

  for (let i = 0; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    const monthDate = excelValueToDate(row[monthKey]);
    if (!monthDate) continue; // skip blank/unparseable rows

    const entries = itemKeyMap.map(({ item, amountKey, quantityKey }) => ({
      itemCategoryId: item.id,
      amount: amountKey ? excelValueToNumber(row[amountKey]) : null,
      quantity: quantityKey ? excelValueToNumber(row[quantityKey]) : null,
    }));

    try {
      await upsertMonthEntries(monthDate, entries, auth.session.username ?? "");
      monthsImported++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ monthsImported, errors });
}
