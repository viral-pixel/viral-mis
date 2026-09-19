import { NextResponse } from "next/server";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEG_COST_ANALYSIS_SUBMODULE_SLUG } from "@/app/lib/managementReportsMeta";
import { collectPotatoOnionSummary } from "@/app/lib/vegetableAdminAnalytics";

export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(VEG_COST_ANALYSIS_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const rows = await collectPotatoOnionSummary();
  return NextResponse.json(rows);
}
