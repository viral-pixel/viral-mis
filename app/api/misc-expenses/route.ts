import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMiscAccess } from "@/app/lib/miscExpensesAccess";

export async function GET() {
  const auth = await requireMiscAccess();
  if (!auth.ok) return auth.response;

  // Query visibility: Admin and the responder (Sandip) see every query; a
  // raiser (Rajiv) sees only the ones he raised — Admin's queries stay
  // hidden from him. Filtered here, in the query itself, not on the screen.
  const queryFilter = auth.role === "raiser" ? { raisedBy: auth.session.username ?? "" } : undefined;
  const rows = await prisma.miscExpense.findMany({
    orderBy: { month: "desc" },
    include: { queries: { where: queryFilter, orderBy: { raisedAt: "asc" } } },
  });
  return NextResponse.json({ role: auth.role, rows });
}
