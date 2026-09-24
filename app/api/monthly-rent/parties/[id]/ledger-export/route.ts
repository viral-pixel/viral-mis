import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";
import { buildMultiSheetXlsxBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";
import { fyLabel } from "@/app/lib/monthlyRentMeta";

// One party's complete ledger — month-wise and year-wise (FY) — from the
// Party Ledger tab (2026-09-24, user's explicit request: "so that I can
// have data monthwise and year wise by fetching into excel").
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const partyId = Number(id);

  const party = await prisma.rentParty.findUnique({ where: { id: partyId } });
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

  const entries = await prisma.rentPaymentEntry.findMany({ where: { partyId }, orderBy: { rentMonth: "asc" } });

  const yearly = new Map<string, number>();
  for (const e of entries) {
    if (e.status !== "Closed" || e.paidAmount == null) continue;
    const fy = fyLabel(e.datePaid ?? e.rentMonth);
    yearly.set(fy, (yearly.get(fy) ?? 0) + e.paidAmount);
  }
  const yearlyRows = [...yearly.entries()].sort(([a], [b]) => a.localeCompare(b));
  const grandTotal = yearlyRows.reduce((s, [, v]) => s + v, 0);

  const buffer = buildMultiSheetXlsxBuffer([
    {
      name: "Monthly",
      headers: ["Month", "Net Payable", "Paid Amount", "Date Paid", "Status", "Remarks"],
      rows: entries.map((e) => [
        e.rentMonth.toISOString().slice(0, 7), e.proposedAmount, e.paidAmount ?? "",
        e.datePaid ? e.datePaid.toISOString().slice(0, 10) : "", e.status, e.remarksAdmin || e.remarksRequester || "",
      ]),
    },
    {
      name: "Yearly (FY)",
      headers: ["Financial Year", "Total Paid"],
      rows: [...yearlyRows, ["Grand Total", grandTotal]],
    },
  ]);

  const safeName = party.partyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "party";
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders(`${safeName}-ledger.xlsx`) });
}
