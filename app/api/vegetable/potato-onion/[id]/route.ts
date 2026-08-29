import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { billNo, billDate, materialReceivedDate, vendorId, source, item, quantity, rate, closingStockNote } = await req.json();
  const qty = quantity === "" || quantity === null || quantity === undefined ? null : Number(quantity);
  const rt = rate === "" || rate === null || rate === undefined ? null : Number(rate);

  const entry = await prisma.potatoOnionEntry.update({
    where: { id: Number(id) },
    data: {
      billNo: billNo ?? "",
      billDate: billDate ? new Date(billDate) : null,
      materialReceivedDate: materialReceivedDate ?? "",
      vendorId: vendorId ? Number(vendorId) : null,
      source: source ?? "",
      item: String(item ?? "").trim(),
      quantity: qty,
      rate: rt,
      amount: qty != null && rt != null ? qty * rt : null,
      closingStockNote: closingStockNote ?? "",
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.potatoOnionEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
