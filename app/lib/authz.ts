import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

// Server-side auth/access gates for API routes. Admin always has full
// access; non-admin users only see modules they've been explicitly
// assigned to (app/lib/session.ts + UserModuleAccess). Checked here, not
// just hidden in the UI, so a scoped user can't reach another module's data
// by calling its API directly.

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  return { ok: true as const, session };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || !session.isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

// Pass the Module's `name` (e.g. "Ketan Reports"). Admin always passes.
export async function requireModuleAccess(moduleName: string) {
  const session = await getSession();
  if (!session.userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (session.isAdmin) return { ok: true as const, session };

  const access = await prisma.userModuleAccess.findFirst({
    where: { userId: session.userId, module: { name: moduleName } },
  });
  if (!access) {
    return { ok: false as const, response: NextResponse.json({ error: "Not authorized for this module" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

// Same check, but keyed off a SubModule's stable `slug` instead of the
// owning Module's display name — so access checks keep working even if the
// Module row is renamed later (e.g. when "Ketan Reports" is reassigned to
// someone else).
export async function requireModuleAccessBySubModuleSlug(subModuleSlug: string) {
  const session = await getSession();
  if (!session.userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (session.isAdmin) return { ok: true as const, session };

  const subModule = await prisma.subModule.findUnique({ where: { slug: subModuleSlug } });
  if (!subModule) {
    return { ok: false as const, response: NextResponse.json({ error: "Unknown sub-module" }, { status: 404 }) };
  }
  const access = await prisma.userModuleAccess.findFirst({
    where: { userId: session.userId, moduleId: subModule.moduleId },
  });
  if (!access) {
    return { ok: false as const, response: NextResponse.json({ error: "Not authorized for this module" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

// Modules a given user can see in nav/dashboards — all of them for Admin,
// only assigned ones otherwise.
export async function getAccessibleModules(userId: number, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.module.findMany({ orderBy: { name: "asc" }, include: { subModules: true } });
  }
  const access = await prisma.userModuleAccess.findMany({
    where: { userId },
    include: { module: { include: { subModules: true } } },
    orderBy: { module: { name: "asc" } },
  });
  return access.map((a) => a.module);
}
