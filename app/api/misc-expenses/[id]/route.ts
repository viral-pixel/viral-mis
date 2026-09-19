import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

// Editing and deleting are Admin-only (Rajiv and Sandip are view + query).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { month, amount, remarks } = await req.json();
  const m = /^(\d{4})-(\d{2})$/.exec(String(month ?? ""));
  if (!m) return NextResponse.json({ error: "Pick a month" }, { status: 400 });
  const amt = Number(amount);
  if (amount === "" || amount == null || isNaN(amt)) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });

  try {
    const row = await prisma.miscExpense.update({
      where: { id: Number(id) },
      data: { month: new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)), amount: amt, remarks: String(remarks ?? "").replace(/\r\n?/g, "\n") },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "That month already has an entry" }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.miscExpense.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
