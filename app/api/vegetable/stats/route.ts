import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";
import {
  collectMonthlyOverview, collectCombinedMonthlyTotal, collectVendorComparison, collectItemTrend, collectDailyVendorEntries,
} from "@/app/lib/vegetableAnalytics";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const p = req.nextUrl.searchParams;
  const from = p.get("from") ?? undefined;
  const to = p.get("to") ?? undefined;

  // Actual distinct Item values used in the Potato/Onion register — drives
  // the Monthly Overview category picker with whatever's really been
  // entered (Potato, Onion, Garlic, Baby Potato, ...), not just the seed
  // suggestions.
  if (p.get("distinctProduceItems")) {
    const rows = await prisma.potatoOnionEntry.findMany({ distinct: ["item"], select: { item: true } });
    return NextResponse.json({ items: rows.map((r) => r.item).filter(Boolean).sort() });
  }

  // Day-precision (unlike every other mode here, which is month-precision) —
  // powers the "Daily Vendor Entries" pivot on the Overview tab.
  if (p.get("dailyByVendor")) {
    if (!from || !to) return NextResponse.json({ error: "from and to (YYYY-MM-DD) are required" }, { status: 400 });
    return NextResponse.json({ rows: await collectDailyVendorEntries({ from, to }) });
  }

  if (p.get("combined")) {
    return NextResponse.json({ rows: await collectCombinedMonthlyTotal({ from, to }) });
  }

  if (p.get("vendorComparison")) {
    const month = p.get("month");
    if (!month) return NextResponse.json({ error: "month is required" }, { status: 400 });
    return NextResponse.json({ rows: await collectVendorComparison(month) });
  }

  if (p.get("itemTrend")) {
    const itemId = p.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    return NextResponse.json({ rows: await collectItemTrend(Number(itemId), { from, to }) });
  }

  const overview = p.get("overview");
  if (overview === "main") {
    return NextResponse.json({ rows: await collectMonthlyOverview({ kind: "main" }, { from, to }) });
  }
  if (overview === "produce") {
    const item = p.get("item");
    if (!item) return NextResponse.json({ error: "item is required" }, { status: 400 });
    return NextResponse.json({ rows: await collectMonthlyOverview({ kind: "produce", item }, { from, to }) });
  }
  if (overview === "cash") {
    const category = p.get("category");
    if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });
    return NextResponse.json({ rows: await collectMonthlyOverview({ kind: "cash", category }, { from, to }) });
  }

  return NextResponse.json({ error: "Unrecognized stats request" }, { status: 400 });
}
