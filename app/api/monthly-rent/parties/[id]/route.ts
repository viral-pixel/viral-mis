import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";
import { toTitleCase } from "@/app/lib/monthlyRentMeta";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await req.json();

  const party = await prisma.rentParty.update({
    where: { id: Number(id) },
    data: {
      partyName: toTitleCase(String(body.partyName).trim()),
      siteName: body.siteName ?? "",
      typeOfPay: body.typeOfPay ?? "",
      amount: body.amount !== undefined && body.amount !== "" ? Number(body.amount) : null,
      tdsDeduction: body.tdsDeduction !== undefined && body.tdsDeduction !== "" ? Number(body.tdsDeduction) : 0,
      netPay: body.netPay !== undefined && body.netPay !== "" ? Number(body.netPay) : null,
      modeOfPay: body.modeOfPay ?? "",
      approxDateOfPay: body.approxDateOfPay ?? "",
      mobileNo: body.mobileNo ?? "",
      status: body.status === "NOT ACTIVE" ? "NOT ACTIVE" : "ACTIVE",
      depositDate: body.depositDate ? new Date(body.depositDate) : null,
      depositAmount: body.depositAmount !== undefined && body.depositAmount !== "" ? Number(body.depositAmount) : null,
      remarks: body.remarks ?? "",
    },
  });
  return NextResponse.json(party);
}

// Admin-only, same as everywhere else in the app — Ketan/Sandip can enter
// and correct data but not permanently remove a party.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.rentParty.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
