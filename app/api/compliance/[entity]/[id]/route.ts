import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin, requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { COMPLIANCE_SUBMODULE_SLUG, coerceEntityBody, getEntityConfig } from "@/app/lib/complianceEntities";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity: entitySlug, id } = await params;
  const entity = getEntityConfig(entitySlug);
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });

  const auth = await requireModuleAccessBySubModuleSlug(COMPLIANCE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const data = coerceEntityBody(entitySlug, body);

  const model = (prisma as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[entity.model];
  const row = await model.update({ where: { id: Number(id) }, data });
  return NextResponse.json(row);
}

// Delete is Admin-only, same rule as the other two tools: records are
// permanent once entered, protecting the underlying compliance history
// (matches the user's own stated goal of "protecting the records forever").
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity: entitySlug, id } = await params;
  const entity = getEntityConfig(entitySlug);
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const model = (prisma as unknown as Record<string, { delete: (args: unknown) => Promise<unknown> }>)[entity.model];
  await model.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
