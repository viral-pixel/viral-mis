import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";

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
  const { partyId, dueDate, proposedAmount } = body;
  if (!partyId || !dueDate || proposedAmount === undefined || proposedAmount === "") {
    return NextResponse.json({ error: "Party, Due Date and Proposed Amount are required" }, { status: 400 });
  }

  const isAdmin = auth.role === "admin";
  const entry = await prisma.rentPaymentEntry.create({
    data: {
      partyId: Number(partyId),
      dueDate: new Date(dueDate),
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
