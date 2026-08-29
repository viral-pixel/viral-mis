import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG, PURCHASE_ITEMS } from "@/app/lib/purchaseItems";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

// Rebuilds the ORIGINAL wide layout (one row per month, one column pair per
// commodity) from the normalized DB rows, so the export round-trips
// through the same shape as the user's real Purchase Report Excel file —
// even though the data is stored normalized internally for analysis.
export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const items = await prisma.purchaseItemCategory.findMany({ orderBy: { sortOrder: "asc" } });
  const entries = await prisma.monthlyPurchase.findMany({ orderBy: { month: "asc" } });

  const headers = ["Sr. No.", "Month"];
  for (const item of items) {
    if (item.hasAmount) headers.push(`${item.name} Amount`);
    if (item.hasQuantity) headers.push(`${item.name} (${item.unit})`);
  }

  const monthKeys = [...new Set(entries.map((e) => e.month.toISOString().slice(0, 10)))].sort();
  const byMonthItem = new Map<string, { amount: number | null; quantity: number | null }>();
  for (const e of entries) {
    byMonthItem.set(`${e.month.toISOString().slice(0, 10)}-${e.itemCategoryId}`, { amount: e.amount, quantity: e.quantity });
  }

  const rows: (string | number)[][] = monthKeys.map((mk, i) => {
    const row: (string | number)[] = [i + 1, mk];
    for (const item of items) {
      const v = byMonthItem.get(`${mk}-${item.id}`);
      if (item.hasAmount) row.push(v?.amount ?? "");
      if (item.hasQuantity) row.push(v?.quantity ?? "");
    }
    return row;
  });

  const buffer = buildXlsxResponseBuffer("Purchase Report", headers, rows);
  return new NextResponse(buffer, { headers: xlsxDownloadHeaders("purchase-report.xlsx") });
}
