import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { date, category, amount, remarks } = await req.json();
  const entry = await prisma.cashPurchaseEntry.update({
    where: { id: Number(id) },
    data: { date: new Date(date), category, amount: Number(amount), remarks: remarks ?? "" },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.cashPurchaseEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
