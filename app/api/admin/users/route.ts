import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    include: { moduleAccess: { include: { module: true } } },
  });
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      isAdmin: u.isAdmin,
      moduleIds: u.moduleAccess.map((a) => a.moduleId),
    }))
  );
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { username, displayName, isAdmin, moduleIds } = await req.json();
  if (!username || !displayName) {
    return NextResponse.json({ error: "Username and display name are required" }, { status: 400 });
  }

  const password = randomPassword();
  try {
    const user = await prisma.user.create({
      data: {
        username: String(username).trim().toLowerCase(),
        displayName,
        isAdmin: !!isAdmin,
        passwordHash: await bcrypt.hash(password, 10),
        moduleAccess: {
          create: (Array.isArray(moduleIds) ? moduleIds : []).map((moduleId: number) => ({ moduleId })),
        },
      },
    });
    return NextResponse.json({ id: user.id, username: user.username, generatedPassword: password }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }
}
