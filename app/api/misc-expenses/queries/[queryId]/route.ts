import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMiscAccess } from "@/app/lib/miscExpensesAccess";

// Answer + close, in one step ("send and closure"). Only the responder
// (Sandip's seat), and only while the query is still Open.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ queryId: string }> }) {
  const auth = await requireMiscAccess();
  if (!auth.ok) return auth.response;
  if (auth.role !== "responder") return NextResponse.json({ error: "Only the finance manager answers queries" }, { status: 403 });
  const { queryId } = await params;

  const { response } = await req.json();
  const text = String(response ?? "").trim();
  if (!text) return NextResponse.json({ error: "Write your response first" }, { status: 400 });

  const existing = await prisma.miscExpenseQuery.findUnique({ where: { id: Number(queryId) } });
  if (!existing) return NextResponse.json({ error: "Query not found" }, { status: 404 });
  if (existing.status === "Closed") return NextResponse.json({ error: "This query is already closed" }, { status: 409 });

  const q = await prisma.miscExpenseQuery.update({
    where: { id: existing.id },
    data: { response: text, status: "Closed", closedAt: new Date(), respondedBy: auth.session.displayName ?? auth.session.username ?? "" },
  });
  return NextResponse.json(q);
}
