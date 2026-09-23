import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleReadAccess } from "@/app/lib/authz";
import { ALKESH_SUBMODULE_SLUG } from "@/app/lib/alkeshMeta";

export async function GET() {
  const auth = await requireModuleReadAccess(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const [vendors, categories, sites] = await Promise.all([
    prisma.alkeshMrpEntry.findMany({ select: { vendorName: true }, distinct: ["vendorName"], orderBy: { vendorName: "asc" } }),
    prisma.alkeshMrpEntry.findMany({ select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
    prisma.alkeshMrpEntry.findMany({ select: { site: true }, distinct: ["site"], orderBy: { site: "asc" } }),
  ]);

  return NextResponse.json({
    vendorNames: vendors.map((v) => v.vendorName).filter(Boolean),
    categories: categories.map((v) => v.category).filter(Boolean),
    sites: sites.map((v) => v.site).filter(Boolean),
  });
}
