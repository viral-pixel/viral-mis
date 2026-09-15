"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select } from "@/app/components/ui";
import { C } from "@/app/lib/constants";
import { IndianRupee, ListChecks, Building2 } from "lucide-react";

interface VendorWiseRow { vendorName: string; vendorType: string; count: number; totalPaid: number; lastPaymentDate: string | null }
interface MonthWiseRow { monthKey: string; monthLabel: string; count: number; normalTotal: number; urgentTotal: number; total: number }
interface EntryRow {
  id: number; vendorName: string; vendorType: string; bankName: string; paymentDate: string; datePaid: string | null;
  amount: number; approvedAmount: number | null; urgency: string; status: string; paymentType: string;
  remarksFinance: string; remarksAdmin: string;
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
// Matches collectVendorPaymentReport's own grouping date (datePaid, falling
// back to paymentDate) so the drill-down here shows exactly the entries
// that made up that row's count — never a mismatched subset.
function entryMonthKey(e: EntryRow) {
  const d = new Date(e.datePaid ?? e.paymentDate);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const REPORT_TYPES = [
  ["vendor", "Vendor-wise"],
  ["month", "Month-wise"],
  ["entries", "All Entries"],
] as const;

export default function VendorPaymentReportPage() {
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number][0]>("vendor");
  const [status, setStatus] = useState<"Closed" | "Open" | "All">("Closed");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{ entries: EntryRow[]; byVendor: VendorWiseRow[]; byMonth: MonthWiseRow[] } | null>(null);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("status", status);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [status, from, to]);

  useEffect(() => {
    setData(null);
    setExpandedVendor(null);
    setExpandedMonth(null);
    fetch(`/api/vendor-payment-report?${qs}`).then((r) => r.json()).then(setData);
  }, [qs]);

  const grandTotal = data ? data.entries.reduce((s, e) => s + (e.approvedAmount ?? e.amount), 0) : 0;
  const vendorCount = data ? data.byVendor.length : 0;

  return (
    <div>
      <SectionHead
        title="Vendor Payment Report"
        sub="Vendor-wise and month-wise breakdowns of payments made, with full entries — shared by Sandip and Admin"
        action={
          <a href={`/api/vendor-payment-report/export?${qs}`} style={{ textDecoration: "none" }}>
            <Btn variant="ghost"><Download size={15} /> Export Excel (all 3 reports)</Btn>
          </a>
        }
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatCard icon={IndianRupee} label={`Total (${status})`} value={fmtMoney(grandTotal)} tint={C.teal} />
        <StatCard icon={Building2} label="Vendors" value={vendorCount} tint={C.amber} />
        <StatCard icon={ListChecks} label="Entries" value={data ? data.entries.length : 0} tint={C.sub} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <Field label="Report">
          <Select value={reportType} onChange={(e) => setReportType(e.target.value as (typeof REPORT_TYPES)[number][0])}>
            {REPORT_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "Closed" | "Open" | "All")}>
            <option value="Closed">Closed (paid)</option>
            <option value="Open">Open (pending)</option>
            <option value="All">All</option>
          </Select>
        </Field>
        <Field label="From date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      {data === null ? <Empty text="Loading…" /> : reportType === "vendor" ? (
        data.byVendor.length === 0 ? <Empty text="No payments for this filter." /> : (
          <Table>
            <thead><tr><Th /><Th>Vendor</Th><Th>Type</Th><Th>Payments</Th><Th>Total Paid</Th><Th>Last Payment</Th></tr></thead>
            <tbody>
              {data.byVendor.map((v) => {
                const isOpen = expandedVendor === v.vendorName;
                return (
                  <Fragment key={v.vendorName}>
                    <tr onClick={() => setExpandedVendor(isOpen ? null : v.vendorName)} style={{ cursor: "pointer" }}>
                      <Td>{isOpen ? <ChevronDown size={14} color={C.sub} /> : <ChevronRight size={14} color={C.sub} />}</Td>
                      <Td>{v.vendorName}</Td><Td>{v.vendorType || "—"}</Td>
                      <Td style={{ color: C.teal, fontWeight: 600, textDecoration: "underline" }}>{v.count}</Td>
                      <Td style={{ fontWeight: 600 }}>{fmtMoney(v.totalPaid)}</Td><Td>{fmtDate(v.lastPaymentDate)}</Td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                          <EntryMiniTable entries={data.entries.filter((e) => e.vendorName === v.vendorName)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )
      ) : reportType === "month" ? (
        data.byMonth.length === 0 ? <Empty text="No payments for this filter." /> : (
          <Table>
            <thead><tr><Th /><Th>Month</Th><Th>Payments</Th><Th>Normal</Th><Th>Urgent</Th><Th>Total</Th></tr></thead>
            <tbody>
              {data.byMonth.map((m) => {
                const isOpen = expandedMonth === m.monthKey;
                return (
                  <Fragment key={m.monthKey}>
                    <tr onClick={() => setExpandedMonth(isOpen ? null : m.monthKey)} style={{ cursor: "pointer" }}>
                      <Td>{isOpen ? <ChevronDown size={14} color={C.sub} /> : <ChevronRight size={14} color={C.sub} />}</Td>
                      <Td>{m.monthLabel}</Td>
                      <Td style={{ color: C.teal, fontWeight: 600, textDecoration: "underline" }}>{m.count}</Td>
                      <Td>{fmtMoney(m.normalTotal)}</Td>
                      <Td style={{ color: C.red }}>{fmtMoney(m.urgentTotal)}</Td><Td style={{ fontWeight: 600 }}>{fmtMoney(m.total)}</Td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                          <EntryMiniTable entries={data.entries.filter((e) => entryMonthKey(e) === m.monthKey)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )
      ) : (
        data.entries.length === 0 ? <Empty text="No payments for this filter." /> : (
          <Table>
            <thead>
              <tr>
                <Th>Payment Date</Th><Th>Date Paid</Th><Th>Vendor</Th><Th>Type</Th><Th>Bank</Th>
                <Th>Amount</Th><Th>Approved</Th><Th>Pay Type</Th><Th>Urgency</Th><Th>Status</Th>
                <Th>Remarks (Finance)</Th><Th>Remarks (Admin)</Th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.id} style={{ background: e.urgency === "Urgent" ? C.redSoft : undefined }}>
                  <Td>{fmtDate(e.paymentDate)}</Td><Td>{fmtDate(e.datePaid)}</Td><Td>{e.vendorName}</Td>
                  <Td>{e.vendorType || "—"}</Td><Td>{e.bankName || "—"}</Td>
                  <Td>{fmtMoney(e.amount)}</Td><Td>{e.approvedAmount != null ? fmtMoney(e.approvedAmount) : "—"}</Td>
                  <Td>{e.paymentType}</Td><Td>{e.urgency}</Td><Td>{e.status}</Td>
                  <Td>{e.remarksFinance || "—"}</Td><Td>{e.remarksAdmin || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      )}
    </div>
  );
}

// The drill-down shown inline when a Payments count is clicked — same shape
// as the All Entries table, just scoped to whichever vendor/month row was
// expanded, using the entries already fetched (no extra request).
function EntryMiniTable({ entries }: { entries: EntryRow[] }) {
  return (
    <div style={{ padding: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <thead>
          <tr>
            <Th>Payment Date</Th><Th>Date Paid</Th><Th>Amount</Th><Th>Approved</Th>
            <Th>Pay Type</Th><Th>Urgency</Th><Th>Status</Th><Th>Remarks (Finance)</Th><Th>Remarks (Admin)</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} style={{ background: e.urgency === "Urgent" ? C.redSoft : undefined }}>
              <Td>{fmtDate(e.paymentDate)}</Td><Td>{fmtDate(e.datePaid)}</Td>
              <Td>{fmtMoney(e.amount)}</Td><Td>{e.approvedAmount != null ? fmtMoney(e.approvedAmount) : "—"}</Td>
              <Td>{e.paymentType}</Td><Td>{e.urgency}</Td><Td>{e.status}</Td>
              <Td>{e.remarksFinance || "—"}</Td><Td>{e.remarksAdmin || "—"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
