import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";

// "YYYY-MM" (from <input type="month">) -> the 1st of that month, UTC.
function monthToDate(v: string): Date {
  const [y, m] = v.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export async function GET(req: NextRequest) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const entries = await prisma.rentPaymentEntry.findMany({
    where,
    include: { party: true },
    orderBy: [{ dueDate: "asc" }, { id: "desc" }],
    take: 1000,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { partyId, rentMonth, proposedAmount } = body;
  if (!partyId || !rentMonth || proposedAmount === undefined || proposedAmount === "") {
    return NextResponse.json({ error: "Party, Rent Month and Proposed Amount are required" }, { status: 400 });
  }

  const isAdmin = auth.role === "admin";
  const entry = await prisma.rentPaymentEntry.create({
    data: {
      partyId: Number(partyId),
      rentMonth: monthToDate(rentMonth),
      // Simplified raise flow has no separate due-date input (2026-09-24,
      // "something simpler") — defaults to today, still editable later from
      // the requests table below if a real due date matters for a party.
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(),
      basicPay: body.basicPay !== undefined && body.basicPay !== "" ? Number(body.basicPay) : 0,
      gst: body.gst !== undefined && body.gst !== "" ? Number(body.gst) : 0,
      tds: body.tds !== undefined && body.tds !== "" ? Number(body.tds) : 0,
      extraPay: body.extraPay !== undefined && body.extraPay !== "" ? Number(body.extraPay) : 0,
      extraDedn: body.extraDedn !== undefined && body.extraDedn !== "" ? Number(body.extraDedn) : 0,
      proposedAmount: Number(proposedAmount),
      remarksRequester: body.remarksRequester ?? "",
      raisedBy: auth.session.username ?? "",
      raisedByName: auth.session.displayName ?? "",
      // Admin-only fields: only honored if this request is actually from an admin.
      paidAmount: isAdmin && body.paidAmount !== undefined && body.paidAmount !== "" ? Number(body.paidAmount) : null,
      datePaid: isAdmin && body.datePaid ? new Date(body.datePaid) : null,
      remarksAdmin: isAdmin ? (body.remarksAdmin ?? "") : "",
      status: isAdmin && body.status === "Closed" ? "Closed" : "Open",
      paidBy: isAdmin && body.status === "Closed" ? (auth.session.displayName ?? "") : "",
      closedAt: isAdmin && body.status === "Closed" ? new Date() : null,
    },
    include: { party: true },
  });
  return NextResponse.json(entry, { status: 201 });
}
