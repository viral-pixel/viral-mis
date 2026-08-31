import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { date } = await params;
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const day = await prisma.rotiDayEntry.findUnique({ where: { date: dateObj }, include: { lines: true } });
  return NextResponse.json(day);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;
  const { date } = await params;
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const existing = await prisma.rotiDayEntry.findUnique({ where: { date: dateObj } });
  if (!existing) return NextResponse.json({ error: "No entry for that date" }, { status: 404 });
  await prisma.rotiDayEntry.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
