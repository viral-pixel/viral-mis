import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const groups = await prisma.purchaseGroup.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(groups);
}

// Lets Admin grow the list of tracked commodity groups over time without a
// code change.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { name, unit, hasAmount, hasQuantity } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }
  const count = await prisma.purchaseGroup.count();
  try {
    const created = await prisma.purchaseGroup.create({
      data: {
        name: String(name).trim(),
        unit: unit ?? "",
        hasAmount: hasAmount !== false,
        hasQuantity: hasQuantity !== false,
        sortOrder: count + 1,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A group with that name already exists" }, { status: 409 });
  }
}
