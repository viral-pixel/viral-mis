import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMiscAccess } from "@/app/lib/miscExpensesAccess";

// Raise a query on a month. Admin and Rajiv can; Sandip (the responder) can't.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiscAccess();
  if (!auth.ok) return auth.response;
  if (auth.role === "responder") return NextResponse.json({ error: "You answer queries — you can't raise them" }, { status: 403 });
  const { id } = await params;

  const { question } = await req.json();
  const text = String(question ?? "").trim();
  if (!text) return NextResponse.json({ error: "Write your query first" }, { status: 400 });

  const expense = await prisma.miscExpense.findUnique({ where: { id: Number(id) } });
  if (!expense) return NextResponse.json({ error: "Month not found" }, { status: 404 });

  const q = await prisma.miscExpenseQuery.create({
    data: {
      expenseId: expense.id,
      question: text,
      raisedBy: auth.session.username ?? "",
      raisedByName: auth.session.displayName ?? auth.session.username ?? "",
    },
  });
  return NextResponse.json(q, { status: 201 });
}
