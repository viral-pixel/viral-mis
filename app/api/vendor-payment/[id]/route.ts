import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin, requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await req.json();
  const isAdmin = !!auth.session.isAdmin;

  // Sandip can fix his own request while it's still Open; once Admin closes
  // it, only Admin can edit/reopen — enforced here too, not just hidden in
  // the UI, so a closed record can't be changed by calling the API directly.
  if (!isAdmin) {
    const existing = await prisma.vendorPaymentEntry.findUnique({ where: { id: Number(id) }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status === "Closed") {
      return NextResponse.json({ error: "This request is already closed — ask Admin to reopen it before editing" }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {
    vendorName: String(body.vendorName).trim(),
    vendorType: (body.vendorType ?? "").trim(),
    bankName: (body.bankName ?? "").trim(),
    contactDetails: (body.contactDetails ?? "").trim(),
    outstandingAmount: body.outstandingAmount ? Number(body.outstandingAmount) : null,
    amount: Number(body.amount),
    paymentDate: new Date(body.paymentDate),
    paymentType: body.paymentType === "Cheque" ? "Cheque" : "NEFT",
    urgency: body.urgency === "Urgent" ? "Urgent" : "Normal",
    remarksFinance: body.remarksFinance ?? "",
  };

  // Admin-only fields — a non-admin PUT simply can't move these, no matter
  // what the request body contains (this is the "clear control" boundary
  // the real workflow relies on: Sandip raises requests, only Admin
  // approves/pays/closes).
  if (isAdmin) {
    data.approvedAmount = body.approvedAmount !== undefined && body.approvedAmount !== "" ? Number(body.approvedAmount) : null;
    data.datePaid = body.datePaid ? new Date(body.datePaid) : null;
    data.remarksAdmin = body.remarksAdmin ?? "";
    data.status = body.status === "Closed" ? "Closed" : "Open";
  }

  const entry = await prisma.vendorPaymentEntry.update({ where: { id: Number(id) }, data });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.vendorPaymentEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
