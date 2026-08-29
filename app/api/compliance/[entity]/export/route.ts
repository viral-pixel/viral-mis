import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { COMPLIANCE_SUBMODULE_SLUG, getEntityConfig } from "@/app/lib/complianceEntities";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity: entitySlug } = await params;
  const entity = getEntityConfig(entitySlug);
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });

  const auth = await requireModuleAccessBySubModuleSlug(COMPLIANCE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const model = (prisma as unknown as Record<string, { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }>)[entity.model];
  const rows = await model.findMany({ orderBy: { id: "asc" } });

  const headers = entity.fields.map((f) => f.label);
  const dataRows = rows.map((row) =>
    entity.fields.map((f) => {
      const v = row[f.key];
      if (v === null || v === undefined) return "";
      if (f.type === "date") return new Date(v as string).toISOString().slice(0, 10);
      if (f.type === "boolean") return v ? "Yes" : "No";
      return v as string | number;
    })
  );

  const buffer = buildXlsxResponseBuffer(entity.label.slice(0, 31), headers, dataRows);
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders(`${entity.slug}.xlsx`) });
}
