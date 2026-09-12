import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { vendorName, amount, paymentDate, urgency, status, remarksFinance, remarksAdmin } = await req.json();
  const entry = await prisma.vendorPaymentEntry.update({
    where: { id: Number(id) },
    data: {
      vendorName: String(vendorName).trim(),
      amount: Number(amount),
      paymentDate: new Date(paymentDate),
      urgency: urgency === "Urgent" ? "Urgent" : "Normal",
      status: status === "Closed" ? "Closed" : "Open",
      remarksFinance: remarksFinance ?? "",
      remarksAdmin: remarksAdmin ?? "",
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.vendorPaymentEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
