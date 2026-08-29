import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const itemId = params.get("itemId");
  const vendorId = params.get("vendorId");
  const from = params.get("from");
  const to = params.get("to");

  const where: Record<string, unknown> = {};
  if (itemId) where.itemId = Number(itemId);
  if (vendorId) where.vendorId = Number(vendorId);
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(`${from}-01`) } : {}),
      ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
    };
  }

  const entries = await prisma.vegetablePurchaseEntry.findMany({
    where,
    include: { item: true, vendor: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 500,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { date, itemId, vendorId, quantity, rate } = await req.json();
  if (!date || !itemId || !vendorId || quantity === undefined || rate === undefined) {
    return NextResponse.json({ error: "Date, Item, Vendor, Quantity and Rate are required" }, { status: 400 });
  }
  const qty = Number(quantity);
  const rt = Number(rate);
  if (isNaN(qty) || isNaN(rt)) return NextResponse.json({ error: "Quantity and Rate must be numbers" }, { status: 400 });

  const entry = await prisma.vegetablePurchaseEntry.create({
    data: {
      date: new Date(date),
      itemId: Number(itemId),
      vendorId: Number(vendorId),
      quantity: qty,
      rate: rt,
      amount: qty * rt,
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
