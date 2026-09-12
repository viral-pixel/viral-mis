import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";

// Autosuggest source lists, independent of whatever status/date filter the
// main list view has applied — otherwise a Sandip who defaults to viewing
// only "Open" requests would get an empty/near-empty vendor list to type
// against once most historical rows are Closed.
export async function GET() {
  const auth = await requireModuleAccessBySubModuleSlug(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const [vendors, vendorTypes, banks] = await Promise.all([
    prisma.vendorPaymentEntry.findMany({ select: { vendorName: true }, distinct: ["vendorName"], orderBy: { vendorName: "asc" } }),
    prisma.vendorPaymentEntry.findMany({ select: { vendorType: true }, distinct: ["vendorType"], orderBy: { vendorType: "asc" } }),
    prisma.vendorPaymentEntry.findMany({ select: { bankName: true }, distinct: ["bankName"], orderBy: { bankName: "asc" } }),
  ]);

  return NextResponse.json({
    vendorNames: vendors.map((v) => v.vendorName).filter(Boolean),
    vendorTypes: vendorTypes.map((v) => v.vendorType).filter(Boolean),
    bankNames: banks.map((v) => v.bankName).filter(Boolean),
  });
}
