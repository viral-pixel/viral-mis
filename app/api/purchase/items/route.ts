import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireAdmin } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseItems";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const items = await prisma.purchaseItemCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(items);
}

// Lets Admin add a new commodity later without a code change/redeploy —
// e.g. if Ketan starts tracking a new item that isn't in the original
// Excel's 26 columns.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { name, unit, hasAmount, hasQuantity } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  const count = await prisma.purchaseItemCategory.count();
  try {
    const created = await prisma.purchaseItemCategory.create({
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
    return NextResponse.json({ error: "An item with that name already exists" }, { status: 409 });
  }
}
