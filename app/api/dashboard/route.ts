import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getAccessibleModules } from "@/app/lib/authz";
import { collectComplianceStats, collectComplianceReminders } from "@/app/lib/complianceReminders";
import { COMPLIANCE_SUBMODULE_SLUG } from "@/app/lib/complianceEntities";

// Aggregates dashboard data across every sub-module the signed-in user can
// see. Only one provider (the compliance tracker) exists so far — add a
// branch here (keyed by SubModule.slug) whenever a new sub-module is built.
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const modules = await getAccessibleModules(session.userId, !!session.isAdmin);
  const accessibleSlugs = new Set(modules.flatMap((m) => m.subModules.map((sm) => sm.slug)));

  const stats: Record<string, unknown> = {};
  let reminders: Awaited<ReturnType<typeof collectComplianceReminders>> = [];

  if (accessibleSlugs.has(COMPLIANCE_SUBMODULE_SLUG)) {
    stats[COMPLIANCE_SUBMODULE_SLUG] = await collectComplianceStats();
    reminders = await collectComplianceReminders();
  }

  return NextResponse.json({ modules, stats, reminders });
}
