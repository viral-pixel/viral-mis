import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseItems";
import { upsertMonthEntries } from "@/app/lib/purchaseUpsert";

// List of months with an entry, most recent first, each with its total
// spend — drives the month picker / summary list on the Purchase page.
export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const entries = await prisma.monthlyPurchase.findMany({ orderBy: { month: "desc" } });
  const byMonth = new Map<string, { month: string; totalAmount: number; itemCount: number }>();
  for (const e of entries) {
    const key = e.month.toISOString().slice(0, 10);
    const existing = byMonth.get(key) ?? { month: key, totalAmount: 0, itemCount: 0 };
    existing.totalAmount += e.amount ?? 0;
    existing.itemCount += 1;
    byMonth.set(key, existing);
  }
  return NextResponse.json([...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month)));
}

// Bulk upsert every item's amount/quantity for one month in a single call —
// the entry form is one grid covering all commodities for the month being
// edited, matching how the original Excel is actually filled in.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { month, entries } = await req.json();
  if (!month || !Array.isArray(entries)) {
    return NextResponse.json({ error: "month and entries[] are required" }, { status: 400 });
  }
  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  await upsertMonthEntries(monthDate, entries, auth.session.username ?? "");

  return NextResponse.json({ ok: true });
}
