import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

// One row per transaction (not one row per month) — this is the natural
// export shape now that multiple entries per group/month are expected.
export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const entries = await prisma.purchaseEntry.findMany({
    include: { group: true },
    orderBy: [{ month: "asc" }, { id: "asc" }],
  });

  const headers = ["Month", "Commodity Group", "Item", "Amount", "Quantity", "Deduction (Yes/No)", "Remarks"];
  const rows = entries.map((e) => [
    e.month.toISOString().slice(0, 7),
    e.group.name,
    e.subItem,
    e.amount ?? "",
    e.quantity ?? "",
    e.isDeduction ? "Yes" : "No",
    e.remarks,
  ]);

  const buffer = buildXlsxResponseBuffer("Purchase Entries", headers, rows);
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders("purchase-entries.xlsx") });
}
