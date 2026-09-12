import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/authz";
import { collectVendorPaymentReport } from "@/app/lib/vendorPaymentReport";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const { entries, byVendor, byMonth } = await collectVendorPaymentReport({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    status: params.get("status") ?? undefined,
  });

  return NextResponse.json({ entries, byVendor, byMonth });
}
