import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectPotatoOnionSummary } from "@/app/lib/vegetableAdminAnalytics";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await collectPotatoOnionSummary();
  return NextResponse.json(rows);
}
