import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const items = await prisma.vegetableItem.findMany({ orderBy: { srNo: "asc" } });
  return NextResponse.json(items);
}

// New items are always appended after the highest existing Sr. No. — the
// order of items 1..70 must never change (other sheets/links depend on
// it), so this never inserts or renumbers.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { name } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  const max = await prisma.vegetableItem.aggregate({ _max: { srNo: true } });
  const srNo = (max._max.srNo ?? 0) + 1;
  try {
    const created = await prisma.vegetableItem.create({ data: { name: String(name).trim(), srNo } });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An item with that name already exists" }, { status: 409 });
  }
}
