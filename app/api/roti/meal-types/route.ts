import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const mealTypes = await prisma.rotiMealType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json(mealTypes);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { name } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Meal type name is required" }, { status: 400 });
  }
  const max = await prisma.rotiMealType.aggregate({ _max: { sortOrder: true } });
  try {
    const created = await prisma.rotiMealType.create({
      data: { name: String(name).trim(), sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A meal type with that name already exists" }, { status: 409 });
  }
}
