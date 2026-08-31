import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

// month is already normalized to the 1st of the month, so a straight
// gte/lte on the parsed "YYYY-MM-01" boundaries works directly.
function monthRange(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}-01`) } : {}),
    ...(to ? { lte: new Date(`${to}-01`) } : {}),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const range = monthRange(req);
  const count = await prisma.purchaseEntry.count({ where: range ? { month: range } : {} });
  return NextResponse.json({ count });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const range = monthRange(req);
  const result = await prisma.purchaseEntry.deleteMany({ where: range ? { month: range } : {} });
  return NextResponse.json({ deleted: result.count });
}
