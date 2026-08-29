import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const modules = await prisma.module.findMany({
    orderBy: { name: "asc" },
    include: { subModules: true, userAccess: { include: { user: true } } },
  });
  return NextResponse.json(modules);
}

// New modules created here have no sub-modules until a developer builds one
// and wires it in app/lib/subModuleRoutes.ts — this just reserves the
// module's identity/ownership ahead of that build.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { name } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Module name is required" }, { status: 400 });
  }

  try {
    const created = await prisma.module.create({ data: { name: String(name).trim() } });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A module with that name already exists" }, { status: 409 });
  }
}
