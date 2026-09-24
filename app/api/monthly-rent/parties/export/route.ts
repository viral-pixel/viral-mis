import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";
import { buildMultiSheetXlsxBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

export async function GET() {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;

  const [parties, payments] = await Promise.all([
    prisma.rentParty.findMany({ orderBy: [{ status: "asc" }, { partyName: "asc" }] }),
    prisma.rentPaymentEntry.findMany({ include: { party: true }, orderBy: [{ dueDate: "asc" }, { id: "asc" }] }),
  ]);

  const buffer = buildMultiSheetXlsxBuffer([
    {
      name: "Rent Parties",
      headers: [
        "Sr. No.", "Party Name", "Site Name", "Type of Pay", "Amount", "TDS Deduction", "Net Pay",
        "Mode of Pay", "Approx Date of Pay", "Mobile No.", "Status", "Deposit Date", "Deposit Amount", "Remarks",
      ],
      rows: parties.map((p) => [
        p.srNo ?? "", p.partyName, p.siteName, p.typeOfPay, p.amount ?? "", p.tdsDeduction, p.netPay ?? "",
        p.modeOfPay, p.approxDateOfPay, p.mobileNo, p.status,
        p.depositDate ? p.depositDate.toISOString().slice(0, 10) : "", p.depositAmount ?? "", p.remarks,
      ]),
    },
    {
      name: "Payment Requests",
      headers: [
        "Party Name", "Site Name", "Rent For Month Of", "Due Date", "Proposed Amount", "Requester Remarks", "Raised By", "Raised At",
        "Status", "Paid Amount", "Date Paid", "Admin Remarks", "Paid By",
      ],
      rows: payments.map((e) => [
        e.party.partyName, e.party.siteName, e.rentMonth.toISOString().slice(0, 7), e.dueDate.toISOString().slice(0, 10), e.proposedAmount, e.remarksRequester,
        e.raisedByName, e.raisedAt.toISOString().slice(0, 10), e.status, e.paidAmount ?? "",
        e.datePaid ? e.datePaid.toISOString().slice(0, 10) : "", e.remarksAdmin, e.paidBy,
      ]),
    },
  ]);

  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders("monthly-rent.xlsx") });
}
