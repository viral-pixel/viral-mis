import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseItems";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { month } = await params;
  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const entries = await prisma.monthlyPurchase.findMany({ where: { month: monthDate } });
  return NextResponse.json(entries);
}

// Admin-only, same rule as the compliance tables — records are permanent
// once entered; deleting a whole month's data is a destructive action.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { month } = await params;
  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  await prisma.monthlyPurchase.deleteMany({ where: { month: monthDate } });
  return NextResponse.json({ ok: true });
}
