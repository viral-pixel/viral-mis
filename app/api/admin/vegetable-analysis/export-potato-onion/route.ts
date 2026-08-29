import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectPotatoOnionSummary } from "@/app/lib/vegetableAdminAnalytics";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await collectPotatoOnionSummary();
  const buffer = buildXlsxResponseBuffer(
    "Pot-Oni-Veg Summ",
    [
      "Month", "Potato Qty", "Potato Amt", "Potato Avg Rate", "Onion Qty", "Onion Amt", "Onion Avg Rate",
      "P+O Qty", "P+O Amt", "Total Veg Exp", "Potato % Veg", "Onion % Veg", "Total %",
      "Monthly Days", "Avg/Day Veg", "Avg/Day Potato", "Avg/Day Onion",
      "Count L/D", "Per Plate Veg (g)", "Per Plate Potato (g)", "Per Plate Onion (g)", "Per Plate Total (g)",
    ],
    rows.filter((r) => r.grandTotal > 0).map((r) => [
      r.monthLabel, r.potatoQty, r.potatoAmount, r.potatoAvgRate, r.onionQty, r.onionAmount, r.onionAvgRate,
      r.totalPOQty, r.totalPOAmount, r.grandTotal, r.potatoPctOfVeg, r.onionPctOfVeg, r.totalPctOfVeg,
      r.monthlyDays, r.avgPDQtyPureVeg, r.avgPDQtyPotato, r.avgPDQtyOnion,
      r.countLD, r.perPlatePureVeg, r.perPlatePotato, r.perPlateOnion, r.perPlateTotalVeg,
    ])
  );
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders("vegetable-potato-onion-summary.xlsx") });
}
