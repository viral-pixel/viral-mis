import { NextResponse } from "next/server";
import { requireModuleReadAccess } from "@/app/lib/authz";
import { VEG_COST_ANALYSIS_SUBMODULE_SLUG } from "@/app/lib/managementReportsMeta";
import { collectAdminVegSummary } from "@/app/lib/vegetableAdminAnalytics";

export async function GET() {
  const auth = await requireModuleReadAccess(VEG_COST_ANALYSIS_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const rows = await collectAdminVegSummary();
  return NextResponse.json(rows);
}
