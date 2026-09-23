import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin, requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ALKESH_SUBMODULE_SLUG } from "@/app/lib/alkeshMeta";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { date, site, milkTeaQty, milkPantryQty, curdQty, buttermilkQty, remarks } = await req.json();
  const vals = [milkTeaQty, milkPantryQty, curdQty, buttermilkQty].map((v) => Number(v ?? 0));
  if (vals.some((v) => isNaN(v))) return NextResponse.json({ error: "Quantities must be numbers" }, { status: 400 });

  const entry = await prisma.alkeshMilkEntry.update({
    where: { id: Number(id) },
    data: {
      date: new Date(date),
      site: String(site).trim(),
      milkTeaQty: vals[0],
      milkPantryQty: vals[1],
      curdQty: vals[2],
      buttermilkQty: vals[3],
      remarks: remarks ?? "",
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.alkeshMilkEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
