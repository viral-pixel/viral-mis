import { NextRequest, NextResponse } from "next/server";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseItems";
import { collectPurchaseStats, collectItemTrend } from "@/app/lib/purchaseAnalytics";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const itemId = req.nextUrl.searchParams.get("itemId");
  if (itemId) {
    const trend = await collectItemTrend(Number(itemId));
    return NextResponse.json({ trend });
  }

  const stats = await collectPurchaseStats();
  return NextResponse.json(stats);
}
