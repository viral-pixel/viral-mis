import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireModuleReadAccess } from "@/app/lib/authz";
import { ALKESH_COMMODITY_CATEGORIES, ALKESH_SUBMODULE_SLUG } from "@/app/lib/alkeshMeta";

export async function GET(req: NextRequest) {
  const auth = await requireModuleReadAccess(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const category = params.get("category");
  const from = params.get("from");
  const to = params.get("to");
  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(`${from}-01`) } : {}),
      ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
    };
  }

  const entries = await prisma.alkeshCommodityEntry.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }], take: 500 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { date, category, quantity, rate, amount, remarks } = await req.json();
  if (!date || !category || amount === undefined) {
    return NextResponse.json({ error: "Date, Category and Amount are required" }, { status: 400 });
  }
  if (!(ALKESH_COMMODITY_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const amt = Number(amount);
  if (isNaN(amt)) return NextResponse.json({ error: "Amount must be a number" }, { status: 400 });
  const qty = quantity === undefined || quantity === "" ? null : Number(quantity);
  const rt = rate === undefined || rate === "" ? null : Number(rate);

  const entry = await prisma.alkeshCommodityEntry.create({
    data: {
      date: new Date(date),
      category: String(category),
      quantity: qty,
      rate: rt,
      amount: amt,
      remarks: remarks ?? "",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
