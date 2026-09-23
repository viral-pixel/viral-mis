import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

interface IngredientInput { name: string; qtyLabel?: string; amount: number }

// Ingredients are replaced wholesale on every save rather than diffed line
// by line — this is low-volume reference data (a handful of recipes, each
// with under 15 ingredients), so the simple approach beats tracking
// per-ingredient identity across edits.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const recipeId = Number(id);

  const {
    category, name, batchQty, batchUnit, servingLabel, servingConversionFactor,
    asOfDate, remarks, ingredients,
  } = await req.json();

  await prisma.$transaction([
    prisma.costingRecipe.update({
      where: { id: recipeId },
      data: {
        category: String(category).trim(),
        name: String(name).trim(),
        batchQty: Number(batchQty),
        batchUnit: batchUnit ?? "KG",
        servingLabel: servingLabel ?? "",
        servingConversionFactor: servingConversionFactor !== undefined && servingConversionFactor !== "" ? Number(servingConversionFactor) : 1,
        asOfDate: asOfDate ? new Date(asOfDate) : undefined,
        remarks: remarks ?? "",
      },
    }),
    prisma.costingRecipeIngredient.deleteMany({ where: { recipeId } }),
    prisma.costingRecipeIngredient.createMany({
      data: (Array.isArray(ingredients) ? (ingredients as IngredientInput[]) : []).map((ing, i) => ({
        recipeId,
        name: String(ing.name).trim(),
        qtyLabel: ing.qtyLabel ?? "",
        amount: Number(ing.amount),
        sortOrder: i,
      })),
    }),
  ]);

  const recipe = await prisma.costingRecipe.findUnique({ where: { id: recipeId }, include: { ingredients: { orderBy: { sortOrder: "asc" } } } });
  return NextResponse.json(recipe);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.costingRecipe.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
