import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectVendorPaymentReport } from "@/app/lib/vendorPaymentReport";
import { buildMultiSheetXlsxBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

function d(v: Date | null) {
  return v ? v.toISOString().slice(0, 10) : "";
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const { entries, byVendor, byMonth } = await collectVendorPaymentReport({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  const buffer = buildMultiSheetXlsxBuffer([
    {
      name: "Vendor-wise",
      headers: ["Vendor Name", "Type", "Payments", "Total Paid", "Last Payment Date"],
      rows: byVendor.map((v) => [v.vendorName, v.vendorType, v.count, Math.round(v.totalPaid), v.lastPaymentDate ? v.lastPaymentDate.slice(0, 10) : ""]),
    },
    {
      name: "Month-wise",
      headers: ["Month", "Payments", "Normal", "Urgent", "Total"],
      rows: byMonth.map((m) => [m.monthLabel, m.count, Math.round(m.normalTotal), Math.round(m.urgentTotal), Math.round(m.total)]),
    },
    {
      name: "Entries",
      headers: [
        "Payment Date (Proposed)", "Date Paid", "Vendor", "Type", "Bank", "Contact",
        "Outstanding", "Amount Requested", "Amount Approved", "Pay Type", "Urgency", "Status",
        "Remarks (Finance)", "Remarks (Admin)",
      ],
      rows: entries.map((e) => [
        d(e.paymentDate), d(e.datePaid), e.vendorName, e.vendorType, e.bankName, e.contactDetails,
        e.outstandingAmount ?? "", Math.round(e.amount), e.approvedAmount != null ? Math.round(e.approvedAmount) : "",
        e.paymentType, e.urgency, e.status, e.remarksFinance, e.remarksAdmin,
      ]),
    },
  ]);

  const from = params.get("from") || "all";
  const to = params.get("to") || "all";
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders(`vendor-payment-report_${from}_to_${to}.xlsx`) });
}
