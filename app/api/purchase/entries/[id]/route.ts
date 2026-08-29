import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { month, groupId, amount, quantity, isDeduction, remarks, subItem } = await req.json();
  const monthDate = new Date(`${String(month).slice(0, 7)}-01`);
  if (isNaN(monthDate.getTime())) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const entry = await prisma.purchaseEntry.update({
    where: { id: Number(id) },
    data: {
      month: monthDate,
      groupId: Number(groupId),
      amount: amount === "" || amount === null || amount === undefined ? null : Number(amount),
      quantity: quantity === "" || quantity === null || quantity === undefined ? null : Number(quantity),
      isDeduction: !!isDeduction,
      subItem: subItem ?? "",
      remarks: remarks ?? "",
    },
  });
  return NextResponse.json(entry);
}

// Admin-only, same rule as everywhere else — records are permanent once
// entered.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.purchaseEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
