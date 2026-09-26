import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireModuleReadAccess } from "@/app/lib/authz";
import { OUTSTANDING_SUBMODULE_SLUG } from "@/app/lib/outstandingMeta";
import { parseOutstandingWorkbook } from "@/app/lib/outstandingParse";

// List of snapshots (newest "as on" first) plus the full content of one —
// the requested id, else the latest. canUpload is true only for Admin or
// someone who really holds the module (a global viewer can read but not add).
export async function GET(req: NextRequest) {
  const auth = await requireModuleReadAccess(OUTSTANDING_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const snapshots = await prisma.outstandingSnapshot.findMany({
    orderBy: [{ asOnDate: { sort: "desc", nulls: "last" } }, { uploadedAt: "desc" }],
    select: { id: true, asOnLabel: true, asOnDate: true, fileName: true, uploadedByName: true, uploadedAt: true },
  });

  const wantedId = Number(req.nextUrl.searchParams.get("id"));
  const pickId = wantedId && snapshots.some((s) => s.id === wantedId) ? wantedId : snapshots[0]?.id;
  const full = pickId ? await prisma.outstandingSnapshot.findUnique({ where: { id: pickId } }) : null;

  let canUpload = !!auth.session.isAdmin;
  if (!canUpload && auth.session.userId) {
    const access = await prisma.userModuleAccess.findFirst({
      where: { userId: auth.session.userId, module: { subModules: { some: { slug: OUTSTANDING_SUBMODULE_SLUG } } } },
    });
    canUpload = !!access;
  }

  return NextResponse.json({
    canUpload,
    isAdmin: !!auth.session.isAdmin,
    snapshots,
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
  return NextResponse.json({ id: snap.id, rows: parsed.rows.length, warnings: parsed.warnings }, { status: 201 });
}
