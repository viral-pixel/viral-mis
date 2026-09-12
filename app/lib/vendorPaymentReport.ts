import { prisma } from "@/app/lib/prisma";
import type { VendorPaymentEntry } from "@prisma/client";

// Shared aggregation for the Vendor Payment reports (admin-only) — one
// query feeds both the on-screen report page and the Excel export, so the
// two can never drift apart. Grouped on datePaid (falling back to
// paymentDate when a row has no datePaid yet), since these are reports of
// money actually paid out, not requests raised.
export interface VendorPaymentReportOpts {
  from?: string;
  to?: string;
  status?: string; // "Open" | "Closed" | "All" — defaults to Closed (actual payments)
}

export interface VendorWiseRow {
  vendorName: string;
  vendorType: string;
  count: number;
  totalPaid: number;
  lastPaymentDate: string | null;
}
export interface MonthWiseRow {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  count: number;
  normalTotal: number;
  urgentTotal: number;
  total: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function reportDate(e: VendorPaymentEntry): Date {
  return e.datePaid ?? e.paymentDate;
}

export async function collectVendorPaymentReport(opts: VendorPaymentReportOpts) {
  const status = opts.status && opts.status !== "All" ? opts.status : "Closed";
  const where: Record<string, unknown> = {};
  if (status !== "All") where.status = status;

  // Date range is applied on the grouping date (datePaid ?? paymentDate) —
  // can't express an OR-coalesced field filter directly in Prisma, so we
  // fetch on paymentDate/datePaid union bounds and refine in JS. In
  // practice nearly every Closed row has datePaid set (paid-marked rows),
  // so this stays cheap.
  const entries = await prisma.vendorPaymentEntry.findMany({ where, orderBy: [{ paymentDate: "asc" }, { id: "asc" }] });

  const from = opts.from ? new Date(opts.from) : null;
  const to = opts.to ? new Date(opts.to) : null;
  const filtered = entries.filter((e) => {
    const d = reportDate(e);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const byVendorMap = new Map<string, VendorWiseRow>();
  const byMonthMap = new Map<string, MonthWiseRow>();

  for (const e of filtered) {
    const paid = e.approvedAmount ?? e.amount;
    const d = reportDate(e);

    const v = byVendorMap.get(e.vendorName) ?? { vendorName: e.vendorName, vendorType: e.vendorType, count: 0, totalPaid: 0, lastPaymentDate: null };
    v.count += 1;
    v.totalPaid += paid;
    if (!v.lastPaymentDate || d.toISOString() > v.lastPaymentDate) v.lastPaymentDate = d.toISOString();
    byVendorMap.set(e.vendorName, v);

    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const m = byMonthMap.get(monthKey) ?? { monthKey, monthLabel: `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, count: 0, normalTotal: 0, urgentTotal: 0, total: 0 };
    m.count += 1;
    if (e.urgency === "Urgent") m.urgentTotal += paid; else m.normalTotal += paid;
    m.total += paid;
    byMonthMap.set(monthKey, m);
  }

  const byVendor = Array.from(byVendorMap.values()).sort((a, b) => b.totalPaid - a.totalPaid);
  const byMonth = Array.from(byMonthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return { entries: filtered, byVendor, byMonth };
}
