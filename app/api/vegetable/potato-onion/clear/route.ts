import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

function dateRange(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}-01`) } : {}),
    ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const range = dateRange(req);
  const count = await prisma.potatoOnionEntry.count({ where: range ? { billDate: range } : {} });
  return NextResponse.json({ count });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const range = dateRange(req);
  const result = await prisma.potatoOnionEntry.deleteMany({ where: range ? { billDate: range } : {} });
  return NextResponse.json({ deleted: result.count });
}
