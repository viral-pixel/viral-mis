import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMiscAccess } from "@/app/lib/miscExpensesAccess";

export async function GET() {
  const auth = await requireMiscAccess();
  if (!auth.ok) return auth.response;

  const rows = await prisma.miscExpense.findMany({
    orderBy: { month: "desc" },
    include: { queries: { orderBy: { raisedAt: "asc" } } },
  });
  return NextResponse.json({ role: auth.role, rows });
}
