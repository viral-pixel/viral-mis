import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectAdminVegSummary } from "@/app/lib/vegetableAdminAnalytics";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await collectAdminVegSummary();
  return NextResponse.json(rows);
}
