import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const vendors = await prisma.vegetableVendor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(vendors);
}

// Free add, no approval — same pattern as every other editable master in
// this app (Vendor lists in particular are meant to grow freely).
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { name } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
  }
  try {
    const created = await prisma.vegetableVendor.create({ data: { name: String(name).trim() } });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A vendor with that name already exists" }, { status: 409 });
  }
}
