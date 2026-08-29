import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { COMPLIANCE_SUBMODULE_SLUG, coerceEntityBody, getEntityConfig } from "@/app/lib/complianceEntities";

// Generic CRUD (list/create here, edit/delete in [id]/route.ts) shared by
// all 8 compliance tables — see app/lib/complianceEntities.ts for why.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity: entitySlug } = await params;
  const entity = getEntityConfig(entitySlug);
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });

  const auth = await requireModuleAccessBySubModuleSlug(COMPLIANCE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const model = (prisma as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown[]> }>)[entity.model];
  const rows = await model.findMany({ orderBy: { id: "desc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity: entitySlug } = await params;
  const entity = getEntityConfig(entitySlug);
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });

  const auth = await requireModuleAccessBySubModuleSlug(COMPLIANCE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const data = coerceEntityBody(entitySlug, body);
  data.enteredBy = auth.session.username ?? "";

  const model = (prisma as unknown as Record<string, { create: (args: unknown) => Promise<unknown> }>)[entity.model];
  const row = await model.create({ data });
  return NextResponse.json(row, { status: 201 });
}
