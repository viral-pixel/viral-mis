import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin, requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ALKESH_COMMODITY_CATEGORIES, ALKESH_SUBMODULE_SLUG } from "@/app/lib/alkeshMeta";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { date, category, quantity, rate, amount, remarks } = await req.json();
  if (!(ALKESH_COMMODITY_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const amt = Number(amount);
  if (isNaN(amt)) return NextResponse.json({ error: "Amount must be a number" }, { status: 400 });
  const qty = quantity === undefined || quantity === "" ? null : Number(quantity);
  const rt = rate === undefined || rate === "" ? null : Number(rate);

  const entry = await prisma.alkeshCommodityEntry.update({
    where: { id: Number(id) },
    data: {
      date: new Date(date),
      category: String(category),
      quantity: qty,
      rate: rt,
      amount: amt,
      remarks: remarks ?? "",
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.alkeshCommodityEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
