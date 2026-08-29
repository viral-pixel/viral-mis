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
  const category = params.get("category");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(`${from}-01`) } : {}),
      ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
    };
  }

  const entries = await prisma.cashPurchaseEntry.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }], take: 500 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { date, category, amount, remarks } = await req.json();
  if (!date || !category || amount === undefined || amount === "") {
    return NextResponse.json({ error: "Date, Category and Amount are required" }, { status: 400 });
  }
  const entry = await prisma.cashPurchaseEntry.create({
    data: { date: new Date(date), category, amount: Number(amount), remarks: remarks ?? "", enteredBy: auth.session.username ?? "" },
  });
  return NextResponse.json(entry, { status: 201 });
}
