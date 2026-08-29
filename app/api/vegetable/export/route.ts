import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";
import { buildMultiSheetXlsxBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const [purchases, potatoOnion, cash] = await Promise.all([
    prisma.vegetablePurchaseEntry.findMany({ include: { item: true, vendor: true }, orderBy: [{ date: "asc" }, { id: "asc" }] }),
    prisma.potatoOnionEntry.findMany({ include: { vendor: true }, orderBy: [{ billDate: "asc" }, { id: "asc" }] }),
    prisma.cashPurchaseEntry.findMany({ orderBy: [{ date: "asc" }, { id: "asc" }] }),
  ]);

  const buffer = buildMultiSheetXlsxBuffer([
    {
      name: "Vegetable Purchases",
      headers: ["Date", "Item", "Vendor", "Quantity", "Rate", "Amount"],
      rows: purchases.map((e) => [e.date.toISOString().slice(0, 10), e.item.name, e.vendor.name, e.quantity, e.rate, Math.round(e.amount)]),
    },
    {
      name: "Potato Onion Garlic",
      headers: ["Bill No", "Bill Date", "Material Received Date", "Vendor", "Source", "Item", "Quantity", "Rate", "Amount", "Closing Stock Note"],
      rows: potatoOnion.map((e) => [
        e.billNo, e.billDate ? e.billDate.toISOString().slice(0, 10) : "", e.materialReceivedDate,
        e.vendor?.name ?? "", e.source, e.item, e.quantity ?? "", e.rate ?? "", e.amount != null ? Math.round(e.amount) : "", e.closingStockNote,
      ]),
    },
    {
      name: "Cash Purchases",
      headers: ["Date", "Category", "Amount", "Remarks"],
      rows: cash.map((e) => [e.date.toISOString().slice(0, 10), e.category, e.amount, e.remarks]),
    },
  ]);

  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders("vegetable-reports.xlsx") });
}
