import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const recipes = await prisma.costingRecipe.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(recipes);
}

interface IngredientInput { name: string; qtyLabel?: string; amount: number }

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const {
    category, name, batchQty, batchUnit, servingLabel, servingConversionFactor,
    asOfDate, remarks, ingredients,
  } = await req.json();

  if (!category || !name || batchQty === undefined) {
    return NextResponse.json({ error: "Category, Name and Batch Qty are required" }, { status: 400 });
  }

  const recipe = await prisma.costingRecipe.create({
    data: {
      category: String(category).trim(),
      name: String(name).trim(),
      batchQty: Number(batchQty),
      batchUnit: batchUnit ?? "KG",
      servingLabel: servingLabel ?? "",
      servingConversionFactor: servingConversionFactor !== undefined && servingConversionFactor !== "" ? Number(servingConversionFactor) : 1,
      asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      remarks: remarks ?? "",
      enteredBy: auth.session.username ?? "",
      ingredients: {
        create: (Array.isArray(ingredients) ? (ingredients as IngredientInput[]) : []).map((ing, i) => ({
          name: String(ing.name).trim(),
          qtyLabel: ing.qtyLabel ?? "",
          amount: Number(ing.amount),
          sortOrder: i,
        })),
      },
    },
    include: { ingredients: true },
  });
  return NextResponse.json(recipe, { status: 201 });
}
