import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";

// List days in range, each with its own line items — the Entries tab sums
// each day's grand total client-side via computeRotiSummary rather than us
// pre-aggregating here, so the same list also feeds the day-detail view
// without a second round trip.
export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const days = await prisma.rotiDayEntry.findMany({
    where,
    include: { lines: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(days);
}

// Upserts a whole day at once: the day record plus every line item, matching
// how the entry grid always submits a full day's worth of quantities
// together. Existing lines for the day are replaced wholesale rather than
// diffed, since a full-day submit is simpler and matches how Kiran actually
// fills the sheet (fill everything, then save).
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { date, remarks, lines } = await req.json();
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const cleanLines: { siteId: number; mealTypeId: number; categoryId: number; quantity: number }[] = Array.isArray(lines)
    ? lines
        .map((l: { siteId: number; mealTypeId: number; categoryId: number; quantity: number }) => ({
          siteId: Number(l.siteId),
          mealTypeId: Number(l.mealTypeId),
          categoryId: Number(l.categoryId),
          quantity: Number(l.quantity),
        }))
        .filter((l: { quantity: number }) => !isNaN(l.quantity) && l.quantity !== 0)
    : [];

  const day = await prisma.$transaction(async (tx) => {
    const existing = await tx.rotiDayEntry.findUnique({ where: { date: dateObj } });
    const dayEntry = existing
      ? await tx.rotiDayEntry.update({
          where: { id: existing.id },
          data: { remarks: remarks ?? "", enteredBy: auth.session.username ?? "" },
        })
      : await tx.rotiDayEntry.create({
          data: { date: dateObj, remarks: remarks ?? "", enteredBy: auth.session.username ?? "" },
        });

    await tx.rotiLineItem.deleteMany({ where: { dayEntryId: dayEntry.id } });
    if (cleanLines.length > 0) {
      await tx.rotiLineItem.createMany({
        data: cleanLines.map((l) => ({ ...l, dayEntryId: dayEntry.id })),
      });
    }
    return tx.rotiDayEntry.findUnique({ where: { id: dayEntry.id }, include: { lines: true } });
  });

  return NextResponse.json(day, { status: 201 });
}
