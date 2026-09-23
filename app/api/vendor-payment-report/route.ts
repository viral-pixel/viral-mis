import { NextRequest, NextResponse } from "next/server";
import { requireModuleReadAccess } from "@/app/lib/authz";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";
import { collectVendorPaymentReport } from "@/app/lib/vendorPaymentReport";

export async function GET(req: NextRequest) {
  const auth = await requireModuleReadAccess(VENDOR_PAYMENT_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const { entries, byVendor, byMonth } = await collectVendorPaymentReport({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  return NextResponse.json({ entries, byVendor, byMonth });
}
