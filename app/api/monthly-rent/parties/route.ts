import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";
import { toTitleCase } from "@/app/lib/monthlyRentMeta";

export async function GET(req: NextRequest) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const parties = await prisma.rentParty.findMany({ where, orderBy: [{ status: "asc" }, { partyName: "asc" }] });
  return NextResponse.json(parties);
}

export async function POST(req: NextRequest) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  if (!body.partyName) {
    return NextResponse.json({ error: "Party Name is required" }, { status: 400 });
  }

  const party = await prisma.rentParty.create({
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
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(party, { status: 201 });
}
