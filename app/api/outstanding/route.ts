import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireModuleReadAccess } from "@/app/lib/authz";
import { OUTSTANDING_SUBMODULE_SLUG } from "@/app/lib/outstandingMeta";
import { parseOutstandingWorkbook } from "@/app/lib/outstandingParse";

// The one current file (the latest upload) — each new upload replaces the
// previous one (user's request, 2026-09-26: "old file can be overwritten by
// the new file"). canUpload is true only for Admin or someone who really
// holds the module (a global viewer can read but not add).
export async function GET() {
  const auth = await requireModuleReadAccess(OUTSTANDING_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const full = await prisma.outstandingSnapshot.findFirst({ orderBy: { uploadedAt: "desc" } });

  let canUpload = !!auth.session.isAdmin;
  if (!canUpload && auth.session.userId) {
    const access = await prisma.userModuleAccess.findFirst({
      where: { userId: auth.session.userId, module: { subModules: { some: { slug: OUTSTANDING_SUBMODULE_SLUG } } } },
    });
    canUpload = !!access;
  }

  return NextResponse.json({
    canUpload,
    selected: full && {
      id: full.id,
      title: full.title,
      asOnLabel: full.asOnLabel,
      fileName: full.fileName,
      uploadedByName: full.uploadedByName,
      uploadedAt: full.uploadedAt,
      summary: JSON.parse(full.summaryJson),
      columns: JSON.parse(full.columnsJson),
      rows: JSON.parse(full.rowsJson),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(OUTSTANDING_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!/\.xlsx?$/i.test(file.name)) return NextResponse.json({ error: "Please upload an Excel file (.xlsx)" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File is too large (limit 5 MB)" }, { status: 400 });

  let parsed;
  try {
    parsed = parseOutstandingWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read the file" }, { status: 400 });
  }
  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: "No party rows found below the table header" }, { status: 400 });
  }

  // Create the new one first, then drop everything older — if the create fails
  // the previous file is still there.
  const snap = await prisma.outstandingSnapshot.create({
    data: {
      title: parsed.title,
      asOnLabel: parsed.asOnLabel,
      asOnDate: parsed.asOnDate,
      fileName: file.name,
      summaryJson: JSON.stringify(parsed.summary),
      columnsJson: JSON.stringify(parsed.columns),
      rowsJson: JSON.stringify(parsed.rows),
      uploadedBy: auth.session.username ?? "",
      uploadedByName: auth.session.displayName ?? "",
    },
  });
  await prisma.outstandingSnapshot.deleteMany({ where: { id: { not: snap.id } } });
  return NextResponse.json({ id: snap.id, rows: parsed.rows.length, warnings: parsed.warnings }, { status: 201 });
}
