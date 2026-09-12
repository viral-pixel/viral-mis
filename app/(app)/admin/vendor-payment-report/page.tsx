"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
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

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("status", status);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [status, from, to]);

  useEffect(() => {
    setData(null);
    fetch(`/api/admin/vendor-payment-report?${qs}`).then((r) => r.json()).then(setData);
  }, [qs]);

  const grandTotal = data ? data.entries.reduce((s, e) => s + (e.approvedAmount ?? e.amount), 0) : 0;
  const vendorCount = data ? data.byVendor.length : 0;

  return (
    <div>
      <SectionHead
        title="Vendor Payment Report"
        sub="Private view, admin only — vendor-wise and month-wise breakdowns of payments made, with full entries"
        action={
          <a href={`/api/admin/vendor-payment-report/export?${qs}`} style={{ textDecoration: "none" }}>
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
            <thead><tr><Th>Vendor</Th><Th>Type</Th><Th>Payments</Th><Th>Total Paid</Th><Th>Last Payment</Th></tr></thead>
            <tbody>
              {data.byVendor.map((v) => (
                <tr key={v.vendorName}>
                  <Td>{v.vendorName}</Td><Td>{v.vendorType || "—"}</Td><Td>{v.count}</Td>
                  <Td style={{ fontWeight: 600 }}>{fmtMoney(v.totalPaid)}</Td><Td>{fmtDate(v.lastPaymentDate)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      ) : reportType === "month" ? (
        data.byMonth.length === 0 ? <Empty text="No payments for this filter." /> : (
          <Table>
            <thead><tr><Th>Month</Th><Th>Payments</Th><Th>Normal</Th><Th>Urgent</Th><Th>Total</Th></tr></thead>
            <tbody>
              {data.byMonth.map((m) => (
                <tr key={m.monthKey}>
                  <Td>{m.monthLabel}</Td><Td>{m.count}</Td><Td>{fmtMoney(m.normalTotal)}</Td>
                  <Td style={{ color: C.red }}>{fmtMoney(m.urgentTotal)}</Td><Td style={{ fontWeight: 600 }}>{fmtMoney(m.total)}</Td>
                </tr>
              ))}
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
