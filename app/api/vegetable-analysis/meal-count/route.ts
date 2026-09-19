import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await prisma.monthlyMealCount.findMany({ orderBy: { monthKey: "asc" } });
  return NextResponse.json(rows);
}

// Upsert — one row per month, admin re-enters the same month to correct it.
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { monthKey, countLD } = await req.json();
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return NextResponse.json({ error: "monthKey must be YYYY-MM" }, { status: 400 });
  const count = Number(countLD);
  if (isNaN(count) || count < 0) return NextResponse.json({ error: "Count L/D must be a non-negative number" }, { status: 400 });

  const row = await prisma.monthlyMealCount.upsert({
    where: { monthKey },
    create: { monthKey, countLD: count, enteredBy: auth.session.username ?? "" },
    update: { countLD: count, enteredBy: auth.session.username ?? "" },
  });
  return NextResponse.json(row);
}
