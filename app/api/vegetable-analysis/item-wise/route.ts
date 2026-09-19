import { NextRequest, NextResponse } from "next/server";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEG_COST_ANALYSIS_SUBMODULE_SLUG } from "@/app/lib/managementReportsMeta";
import { collectItemWiseAnalysis } from "@/app/lib/vegetableAdminAnalytics";

export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEG_COST_ANALYSIS_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  const result = await collectItemWiseAnalysis(month);
  return NextResponse.json(result);
}
