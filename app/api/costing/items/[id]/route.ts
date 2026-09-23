import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const {
    category, name, ratePerUnit, servingQtyLabel, servingsPerUnitLabel,
    costBasis, conversionFactor, wastagePct, countPerPlate,
    accompanimentsCost, tadkaCost, asOfDate, remarks,
  } = await req.json();

  const item = await prisma.costingItem.update({
    where: { id: Number(id) },
    data: {
      category: String(category).trim(),
      name: String(name).trim(),
      ratePerUnit: Number(ratePerUnit),
      servingQtyLabel: servingQtyLabel ?? "",
      servingsPerUnitLabel: servingsPerUnitLabel ?? "",
      costBasis: costBasis === "PER_PIECE" ? "PER_PIECE" : "PER_KG",
      conversionFactor: conversionFactor !== undefined && conversionFactor !== "" ? Number(conversionFactor) : 1,
      wastagePct: wastagePct !== undefined && wastagePct !== "" ? Number(wastagePct) : 10,
      countPerPlate: countPerPlate ?? "",
      accompanimentsCost: accompanimentsCost === "" || accompanimentsCost === undefined || accompanimentsCost === null ? null : Number(accompanimentsCost),
      tadkaCost: tadkaCost === "" || tadkaCost === undefined || tadkaCost === null ? null : Number(tadkaCost),
      asOfDate: asOfDate ? new Date(asOfDate) : undefined,
      remarks: remarks ?? "",
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.costingItem.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
