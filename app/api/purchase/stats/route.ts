import { NextRequest, NextResponse } from "next/server";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";
import { collectPurchaseStats, collectGroupTrend } from "@/app/lib/purchaseAnalytics";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(PURCHASE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const groupId = params.get("groupId");
  const trendForGroupId = params.get("trendGroupId");

  if (trendForGroupId) {
    const trend = await collectGroupTrend(Number(trendForGroupId), { from, to });
    return NextResponse.json({ trend });
  }

  const stats = await collectPurchaseStats({ from, to, groupId: groupId ? Number(groupId) : undefined });
  return NextResponse.json(stats);
}
