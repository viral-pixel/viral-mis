import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";
import { WEEKLY_MIS_LINES } from "@/app/lib/alkeshMeta";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const targets = await prisma.alkeshWeeklyTarget.findMany();
  return NextResponse.json(targets);
}

// Upserts one category's monthly target, or clears it when monthlyTarget is
// blank/null — mirrors the source sheet's Target row, but editable instead
// of retyped every month.
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { category, monthlyTarget } = await req.json();
  if (!(WEEKLY_MIS_LINES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }

  if (monthlyTarget === null || monthlyTarget === undefined || monthlyTarget === "") {
    await prisma.alkeshWeeklyTarget.deleteMany({ where: { category } });
    return NextResponse.json({ ok: true });
  }

  const val = Number(monthlyTarget);
  if (isNaN(val)) return NextResponse.json({ error: "Target must be a number" }, { status: 400 });

  const row = await prisma.alkeshWeeklyTarget.upsert({
    where: { category },
    update: { monthlyTarget: val },
    create: { category, monthlyTarget: val },
  });
  return NextResponse.json(row);
}
