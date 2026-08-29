import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";

function withSubItems<T extends { subItemsCsv: string }>(g: T) {
  const { subItemsCsv, ...rest } = g;
  return { ...rest, subItems: subItemsCsv ? subItemsCsv.split(",") : [] };
}

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const groups = await prisma.purchaseGroup.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(groups.map(withSubItems));
}

// Lets Admin grow the list of tracked commodity groups over time without a
// code change — including defining sub-items for a group that combines
// several physical items, same as the 4 that shipped with the redesign.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { name, unit, hasAmount, hasQuantity, subItems } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }
  const subItemsCsv = Array.isArray(subItems) ? subItems.map((s: string) => s.trim()).filter(Boolean).join(",") : "";
  const count = await prisma.purchaseGroup.count();
  try {
    const created = await prisma.purchaseGroup.create({
      data: {
        name: String(name).trim(),
        unit: unit ?? "",
        hasAmount: hasAmount !== false,
        hasQuantity: hasQuantity !== false,
        sortOrder: count + 1,
        subItemsCsv,
      },
    });
    return NextResponse.json(withSubItems(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: "A group with that name already exists" }, { status: 409 });
  }
}
