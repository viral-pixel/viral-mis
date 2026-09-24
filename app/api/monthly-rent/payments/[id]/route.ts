import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await req.json();
  const isAdmin = auth.role === "admin";

  // Ketan/Sandip can fix their own request while it's still Open; once
  // Admin closes it, only Admin can edit/reopen — enforced here too, not
  // just hidden in the UI, same boundary as Vendor Payment.
  if (!isAdmin) {
    const existing = await prisma.rentPaymentEntry.findUnique({ where: { id: Number(id) }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status === "Closed") {
      return NextResponse.json({ error: "This request is already closed — ask Admin to reopen it before editing" }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {
    partyId: Number(body.partyId),
    dueDate: new Date(body.dueDate),
    proposedAmount: Number(body.proposedAmount),
    remarksRequester: body.remarksRequester ?? "",
  };

  if (isAdmin) {
    const wasClosed = body.status === "Closed";
    data.paidAmount = body.paidAmount !== undefined && body.paidAmount !== "" ? Number(body.paidAmount) : null;
    data.datePaid = body.datePaid ? new Date(body.datePaid) : null;
    data.remarksAdmin = body.remarksAdmin ?? "";
    data.status = wasClosed ? "Closed" : "Open";
    if (wasClosed) {
      const existing = await prisma.rentPaymentEntry.findUnique({ where: { id: Number(id) }, select: { status: true, closedAt: true } });
      data.paidBy = auth.session.displayName ?? "";
      data.closedAt = existing?.status === "Closed" && existing.closedAt ? existing.closedAt : new Date();
    } else {
      data.paidBy = "";
      data.closedAt = null;
    }
  }

  const entry = await prisma.rentPaymentEntry.update({ where: { id: Number(id) }, data, include: { party: true } });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.rentPaymentEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
