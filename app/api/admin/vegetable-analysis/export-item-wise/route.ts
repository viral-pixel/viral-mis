import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectItemWiseAnalysis } from "@/app/lib/vegetableAdminAnalytics";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  const data = await collectItemWiseAnalysis(month);
  const rows: (string | number | null)[][] = data.items.map((i) => [
    i.srNo, i.itemName, i.jakirRate, i.rajuRate, i.jakirQty, i.rajuQty, i.totalQty, i.jakirAmount, i.rajuAmount, i.totalAmount,
  ]);
  // Mirror the original sheet's own trailing summary rows.
  rows.push(["", "", "", "", "", "", "", "", "", ""]);
  rows.push(["", "TTL", "", "", data.totalJakirQty, data.totalRajuQty, data.totalVegQty, data.totalJakirAmount, data.totalRajuAmount, data.totalVegAmount]);
  rows.push(["", "FRUIT (cash)", "", "", "", "", "", "", "", data.fruitCashAmount]);
  rows.push(["", "Total Veg+Fr", "", "", "", "", "", "", "", data.grandTotalWithFruit]);
  rows.push(["", `AVG (per day, ${data.monthlyDays}d)`, "", "", "", "", data.avgPerDayQty, "", "", data.avgPerDayAmount]);

  const buffer = buildXlsxResponseBuffer(
    "Veg Analysis",
    ["Sr No", "Item", "Jakir Rate", "Raju Rate", "Jakir Qty", "Raju Qty", "Total Qty", "Jakir Amt", "Raju Amt", "Total Amt"],
    rows
  );
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders(`vegetable-item-wise-${month}.xlsx`) });
}
