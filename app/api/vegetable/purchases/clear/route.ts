import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

// Bulk-clear for test data cleanup before going live — admin-only, GET
// previews the count so the confirmation UI can show the blast radius
// before DELETE actually removes anything. from/to are "YYYY-MM"; omitting
// both clears the entire table.
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
  const count = await prisma.vegetablePurchaseEntry.count({ where: range ? { date: range } : {} });
  return NextResponse.json({ count });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const range = dateRange(req);
  const result = await prisma.vegetablePurchaseEntry.deleteMany({ where: range ? { date: range } : {} });
  return NextResponse.json({ deleted: result.count });
}
