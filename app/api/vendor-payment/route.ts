import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (from || to) {
    where.paymentDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const entries = await prisma.vendorPaymentEntry.findMany({ where, orderBy: [{ paymentDate: "desc" }, { id: "desc" }], take: 1000 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { vendorName, amount, paymentDate } = body;
  if (!vendorName || amount === undefined || amount === "" || !paymentDate) {
    return NextResponse.json({ error: "Vendor Name, Amount and Payment Date are required" }, { status: 400 });
  }

  const isAdmin = !!auth.session.isAdmin;
  const entry = await prisma.vendorPaymentEntry.create({
    data: {
      vendorName: String(vendorName).trim(),
      vendorType: (body.vendorType ?? "").trim(),
      bankName: (body.bankName ?? "").trim(),
      contactDetails: (body.contactDetails ?? "").trim(),
      outstandingAmount: body.outstandingAmount ? Number(body.outstandingAmount) : null,
      amount: Number(amount),
      paymentDate: new Date(paymentDate),
      paymentType: body.paymentType === "Cheque" ? "Cheque" : "NEFT",
      urgency: body.urgency === "Urgent" ? "Urgent" : "Normal",
      remarksFinance: body.remarksFinance ?? "",
      // Admin-only fields: only honored if this request is actually from an admin.
      approvedAmount: isAdmin && body.approvedAmount !== undefined && body.approvedAmount !== "" ? Number(body.approvedAmount) : null,
      datePaid: isAdmin && body.datePaid ? new Date(body.datePaid) : null,
      remarksAdmin: isAdmin ? (body.remarksAdmin ?? "") : "",
      status: isAdmin && body.status === "Closed" ? "Closed" : "Open",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
