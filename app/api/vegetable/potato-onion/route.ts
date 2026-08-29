import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const item = params.get("item");

  const where: Record<string, unknown> = {};
  if (item) where.item = item;
  if (from || to) {
    where.billDate = {
      ...(from ? { gte: new Date(`${from}-01`) } : {}),
      ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
    };
  }

  const entries = await prisma.potatoOnionEntry.findMany({
    where,
    include: { vendor: true },
    orderBy: [{ billDate: "desc" }, { id: "desc" }],
    take: 500,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { billNo, billDate, materialReceivedDate, vendorId, source, item, quantity, rate, closingStockNote } = await req.json();
  if (!billDate || !item) {
    return NextResponse.json({ error: "Bill Date and Item are required" }, { status: 400 });
  }
  const qty = quantity === "" || quantity === null || quantity === undefined ? null : Number(quantity);
  const rt = rate === "" || rate === null || rate === undefined ? null : Number(rate);

  const entry = await prisma.potatoOnionEntry.create({
    data: {
      billNo: billNo ?? "",
      billDate: new Date(billDate),
      materialReceivedDate: materialReceivedDate ?? "",
      vendorId: vendorId ? Number(vendorId) : null,
      source: source ?? "",
      item: String(item).trim(),
      quantity: qty,
      rate: rt,
      amount: qty != null && rt != null ? qty * rt : null,
      closingStockNote: closingStockNote ?? "",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
