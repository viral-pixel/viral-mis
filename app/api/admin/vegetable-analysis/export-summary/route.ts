import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectAdminVegSummary } from "@/app/lib/vegetableAdminAnalytics";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await collectAdminVegSummary();
  const buffer = buildXlsxResponseBuffer(
    "Vegetable Report",
    ["Month", "Jakir Amt", "Raju Amt", "Pure Veg Amt", "Potato Amt", "Potato Qty", "Onion Amt", "Onion Qty", "Flakes Amt", "Fruit & Cash Amt", "Grand Total", "Non-Veg %", "Count L/D", "Per Plate Veg (g)"],
    rows.filter((r) => r.grandTotal > 0).map((r) => [
      r.monthLabel, r.jakirAmount, r.rajuAmount, r.pureVegAmount,
      r.potatoAmount, r.potatoQty, r.onionAmount, r.onionQty,
      r.flakesAmount, r.fruitCashAmount, r.grandTotal, r.nonVegPct, r.countLD, r.perPlatePureVeg,
    ])
  );
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders("vegetable-cost-monthly-summary.xlsx") });
}
