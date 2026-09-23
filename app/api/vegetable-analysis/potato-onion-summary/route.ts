import { NextResponse } from "next/server";
import { requireModuleReadAccess } from "@/app/lib/authz";
import { VEG_COST_ANALYSIS_SUBMODULE_SLUG } from "@/app/lib/managementReportsMeta";
import { collectPotatoOnionSummary } from "@/app/lib/vegetableAdminAnalytics";

export async function GET() {
  const auth = await requireModuleReadAccess(VEG_COST_ANALYSIS_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const rows = await collectPotatoOnionSummary();
  return NextResponse.json(rows);
}
