import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Updates display name / admin flag / module assignments in one call, and
// can also reset the password (returned once in the response — never
// stored anywhere else, matching the no-email reset pattern used in the
// other two tools).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const userId = Number(id);

  const { displayName, isAdmin, moduleIds, resetPassword } = await req.json();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { displayName, isAdmin: !!isAdmin },
    }),
    prisma.userModuleAccess.deleteMany({ where: { userId } }),
    prisma.userModuleAccess.createMany({
      data: (Array.isArray(moduleIds) ? moduleIds : []).map((moduleId: number) => ({ userId, moduleId })),
    }),
  ]);

  let generatedPassword: string | undefined;
  if (resetPassword) {
    generatedPassword = randomPassword();
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(generatedPassword, 10) } });
  }

  return NextResponse.json({ ok: true, generatedPassword });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  if (Number(id) === auth.session.userId) {
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
