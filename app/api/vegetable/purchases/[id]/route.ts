import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { date, itemId, vendorId, quantity, rate } = await req.json();
  const qty = Number(quantity);
  const rt = Number(rate);
  if (isNaN(qty) || isNaN(rt)) return NextResponse.json({ error: "Quantity and Rate must be numbers" }, { status: 400 });

  const entry = await prisma.vegetablePurchaseEntry.update({
    where: { id: Number(id) },
    data: {
      date: new Date(date),
      itemId: Number(itemId),
      vendorId: Number(vendorId),
      quantity: qty,
      rate: rt,
      amount: qty * rt,
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.vegetablePurchaseEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
