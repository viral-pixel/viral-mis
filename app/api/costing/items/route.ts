import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const items = await prisma.costingItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { id: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const {
    category, name, ratePerUnit, servingQtyLabel, servingsPerUnitLabel,
    costBasis, conversionFactor, wastagePct, countPerPlate,
    accompanimentsCost, tadkaCost, asOfDate, remarks,
  } = await req.json();

  if (!category || !name || ratePerUnit === undefined) {
    return NextResponse.json({ error: "Category, Name and Rate are required" }, { status: 400 });
  }

  const item = await prisma.costingItem.create({
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
      asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      remarks: remarks ?? "",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
