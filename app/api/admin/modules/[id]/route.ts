import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

// Renaming is the main operation here — e.g. when "Ketan Reports" needs to
// become someone else's name. Module identity (id) never changes, so
// UserModuleAccess and SubModule links stay intact across a rename.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const { name } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Module name is required" }, { status: 400 });
  }

  try {
    const updated = await prisma.module.update({ where: { id: Number(id) }, data: { name: String(name).trim() } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "A module with that name already exists" }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.module.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
