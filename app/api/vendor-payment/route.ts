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

  const entries = await prisma.vendorPaymentEntry.findMany({ where, orderBy: [{ paymentDate: "asc" }, { id: "asc" }], take: 1000 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { vendorName, amount, paymentDate, urgency, status, remarksFinance, remarksAdmin } = await req.json();
  if (!vendorName || amount === undefined || amount === "" || !paymentDate) {
    return NextResponse.json({ error: "Vendor Name, Amount and Payment Date are required" }, { status: 400 });
  }
  const entry = await prisma.vendorPaymentEntry.create({
    data: {
      vendorName: String(vendorName).trim(),
      amount: Number(amount),
      paymentDate: new Date(paymentDate),
      urgency: urgency === "Urgent" ? "Urgent" : "Normal",
      status: status === "Closed" ? "Closed" : "Open",
      remarksFinance: remarksFinance ?? "",
      remarksAdmin: remarksAdmin ?? "",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
