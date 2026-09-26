import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

// Admin-only, same as every other delete in the app — a wrongly uploaded
// snapshot gets removed by Admin, then the correct file is uploaded again.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.outstandingSnapshot.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
