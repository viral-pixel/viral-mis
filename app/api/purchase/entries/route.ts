import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";

// Supports optional ?groupId=&from=YYYY-MM&to=YYYY-MM filters so both the
// Monthly Entries list and the Costing Analysis dashboard can narrow down
// to specific months/commodities instead of always pulling everything.
export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const groupId = req.nextUrl.searchParams.get("groupId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const subItem = req.nextUrl.searchParams.get("subItem");

  const where: Record<string, unknown> = {};
  if (groupId) where.groupId = Number(groupId);
  if (subItem) where.subItem = subItem;
  if (from || to) {
    where.month = {
      ...(from ? { gte: new Date(`${from}-01`) } : {}),
      ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
    };
  }

  const entries = await prisma.purchaseEntry.findMany({
    where,
    include: { group: true },
    orderBy: [{ month: "desc" }, { id: "desc" }],
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { month, groupId, amount, quantity, isDeduction, remarks, subItem } = await req.json();
  if (!month || !groupId) {
    return NextResponse.json({ error: "month and groupId are required" }, { status: 400 });
  }
  const monthDate = new Date(`${String(month).slice(0, 7)}-01`);
  if (isNaN(monthDate.getTime())) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const entry = await prisma.purchaseEntry.create({
    data: {
      month: monthDate,
      groupId: Number(groupId),
      amount: amount === "" || amount === null || amount === undefined ? null : Number(amount),
      quantity: quantity === "" || quantity === null || quantity === undefined ? null : Number(quantity),
      isDeduction: !!isDeduction,
      subItem: subItem ?? "",
      remarks: remarks ?? "",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
