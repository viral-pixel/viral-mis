import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectAdminVegSummary, AdminVegMonthRow } from "@/app/lib/vegetableAdminAnalytics";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

type FieldGroup = "amount" | "quantity" | "perplate" | "vendor";

// Same column groupings as the "Show:" checkboxes on the Monthly Summary
// tab, so the export always matches whatever the admin has on screen.
const COLUMNS: Record<FieldGroup, { header: string; get: (r: AdminVegMonthRow) => string | number | null }[]> = {
  amount: [
    { header: "Pure Veg Amt", get: (r) => r.pureVegAmount },
    { header: "Potato Amt", get: (r) => r.potatoAmount },
    { header: "Onion Amt", get: (r) => r.onionAmount },
    { header: "Flakes Amt", get: (r) => r.flakesAmount },
    { header: "Fruit & Cash Amt", get: (r) => r.fruitCashAmount },
    { header: "Grand Total", get: (r) => r.grandTotal },
    { header: "Non-Veg %", get: (r) => r.nonVegPct },
  ],
  quantity: [
    { header: "Veg Qty", get: (r) => r.pureVegQty },
    { header: "Potato Qty", get: (r) => r.potatoQty },
    { header: "Onion Qty", get: (r) => r.onionQty },
  ],
  perplate: [
    { header: "Count L/D", get: (r) => r.countLD },
    { header: "Per Plate Veg (g)", get: (r) => r.perPlatePureVeg },
    { header: "Per Plate Potato (g)", get: (r) => r.perPlatePotato },
    { header: "Per Plate Onion (g)", get: (r) => r.perPlateOnion },
  ],
  vendor: [
    { header: "Jakir Amt", get: (r) => r.jakirAmount },
    { header: "Raju Amt", get: (r) => r.rajuAmount },
    { header: "Jakir Qty", get: (r) => r.jakirQty },
    { header: "Raju Qty", get: (r) => r.rajuQty },
    { header: "Per Plate Jakir (g)", get: (r) => r.perPlateJakir },
    { header: "Per Plate Raju (g)", get: (r) => r.perPlateRaju },
  ],
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const requested = (params.get("fields")?.split(",").filter(Boolean) as FieldGroup[]) ?? [];
  const groups = requested.length > 0 ? requested.filter((g) => g in COLUMNS) : (["amount", "quantity", "perplate", "vendor"] as FieldGroup[]);
  const from = params.get("from");
  const to = params.get("to");

  const columns = groups.flatMap((g) => COLUMNS[g]);
  let rows = await collectAdminVegSummary();
  rows = rows.filter((r) => r.grandTotal > 0);
  if (from) rows = rows.filter((r) => r.monthKey >= from);
  if (to) rows = rows.filter((r) => r.monthKey <= to);

  const buffer = buildXlsxResponseBuffer(
    "Vegetable Report",
    ["Month", ...columns.map((c) => c.header)],
    rows.map((r) => [r.monthLabel, ...columns.map((c) => c.get(r))])
  );
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders("vegetable-cost-monthly-summary.xlsx") });
}
