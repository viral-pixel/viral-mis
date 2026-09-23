import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin, requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ALKESH_SUBMODULE_SLUG } from "@/app/lib/alkeshMeta";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { date, vendorName, category, site, amount, remarks } = await req.json();
  const amt = Number(amount);
  if (isNaN(amt)) return NextResponse.json({ error: "Amount must be a number" }, { status: 400 });

  const entry = await prisma.alkeshMrpEntry.update({
    where: { id: Number(id) },
    data: {
      date: new Date(date),
      vendorName: String(vendorName).trim(),
      category: String(category).trim(),
      site: String(site).trim(),
      amount: amt,
      remarks: remarks ?? "",
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.alkeshMrpEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
