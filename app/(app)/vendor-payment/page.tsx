"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, IndianRupee, AlertTriangle, ListChecks } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete, Tag } from "@/app/components/ui";
import { C, FONT_HEAD, FONT_BODY } from "@/app/lib/constants";

interface PaymentRow {
  id: number;
  vendorName: string;
  amount: number;
  paymentDate: string;
  urgency: string;
  status: string;
  remarksFinance: string;
  remarksAdmin: string;
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function UrgencyTag({ value }: { value: string }) {
  return value === "Urgent" ? <Tag color={C.red} bg={C.redSoft}>URGENT</Tag> : <Tag color={C.sub} bg={C.border}>Normal</Tag>;
}
function StatusTag({ value }: { value: string }) {
  return value === "Closed" ? <Tag color={C.green} bg="#E6F1E5">CLOSED</Tag> : <Tag color={C.amber} bg={C.amberSoft}>OPEN</Tag>;
}

export default function VendorPaymentPage() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"Open" | "Closed" | "All">("Open");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vendorNames, setVendorNames] = useState<string[]>([]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter !== "All") p.set("status", statusFilter);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [statusFilter, from, to]);

  const load = () =>
    fetch(`/api/vendor-payment?${qs}`)
      .then((r) => r.json())
      .then((d: PaymentRow[]) => {
        setRows(d);
        setVendorNames((prev) => Array.from(new Set([...prev, ...d.map((r) => r.vendorName)])).sort());
      });

  useEffect(() => { load(); }, [qs]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/vendor-payment/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  const toggleStatus = async (r: PaymentRow) => {
    const res = await fetch(`/api/vendor-payment/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, status: r.status === "Open" ? "Closed" : "Open" }),
    });
    if (res.ok) load(); else alert("Could not update");
  };

  const openTotals = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    (rows ?? []).filter((r) => r.status === "Open").forEach((r) => {
      const key = r.paymentDate.slice(0, 10);
      const cur = map.get(key) ?? { total: 0, count: 0 };
      cur.total += r.amount; cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const grandOpenTotal = openTotals.reduce((s, [, v]) => s + v.total, 0);
  const openCount = (rows ?? []).filter((r) => r.status === "Open").length;
  const urgentOpenCount = (rows ?? []).filter((r) => r.status === "Open" && r.urgency === "Urgent").length;

  return (
    <div>
      <SectionHead
        title="Vendor Payment"
        sub="Payment requests to vendors — Sandip raises a request, Admin reviews and closes it once paid"
        action={<Btn onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Add Payment Request</Btn>}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatCard icon={IndianRupee} label="Total Pending (Open)" value={fmtMoney(grandOpenTotal)} tint={C.teal} />
        <StatCard icon={AlertTriangle} label="Urgent & Open" value={urgentOpenCount} tint={C.red} />
        <StatCard icon={ListChecks} label="Open Requests" value={openCount} tint={C.amber} />
      </div>

      {openTotals.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Total Requested Per Date (Open only) — know this before initiating payments
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {openTotals.map(([date, v]) => (
              <div key={date} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", minWidth: 140 }}>
                <div style={{ fontSize: 11.5, color: C.sub }}>{fmtDate(date)}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink }}>{fmtMoney(v.total)}</div>
                <div style={{ fontSize: 11, color: C.faint }}>{v.count} request{v.count === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "Open" | "Closed" | "All")}>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="All">All</option>
          </Select>
        </Field>
        <Field label="From date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No payment requests for this filter yet." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Payment Date</Th><Th>Vendor</Th><Th>Amount</Th><Th>Urgency</Th><Th>Status</Th>
              <Th>Remarks (Finance)</Th><Th>Remarks (Admin)</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.paymentDate)}</Td>
                <Td>{r.vendorName}</Td>
                <Td>{fmtMoney(r.amount)}</Td>
                <Td><UrgencyTag value={r.urgency} /></Td>
                <Td><StatusTag value={r.status} /></Td>
                <Td>{r.remarksFinance || "—"}</Td>
                <Td>{r.remarksAdmin || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => toggleStatus(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                      {r.status === "Open" ? "Close" : "Reopen"}
                    </button>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(r.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && (
        <PaymentForm
          initial={editing}
          vendorNames={vendorNames}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function PaymentForm({
  initial, vendorNames, onClose, onSaved,
}: {
  initial: PaymentRow | null; vendorNames: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [vendorName, setVendorName] = useState(initial?.vendorName ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [paymentDate, setPaymentDate] = useState(initial?.paymentDate?.slice(0, 10) ?? "");
  const [urgency, setUrgency] = useState(initial?.urgency ?? "Normal");
  const [status, setStatus] = useState(initial?.status ?? "Open");
  const [remarksFinance, setRemarksFinance] = useState(initial?.remarksFinance ?? "");
  const [remarksAdmin, setRemarksAdmin] = useState(initial?.remarksAdmin ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !amount || !paymentDate) { setError("Vendor Name, Amount and Payment Date are required"); return; }
    setSaving(true); setError("");
    const url = initial ? `/api/vendor-payment/${initial.id}` : "/api/vendor-payment";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorName: vendorName.trim(), amount, paymentDate, urgency, status, remarksFinance, remarksAdmin }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Payment Request" : "Add Payment Request"} onClose={onClose} width={520}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Vendor Name">
          <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} list="vendor-name-suggestions" required />
          <datalist id="vendor-name-suggestions">
            {vendorNames.map((v) => <option key={v} value={v} />)}
          </datalist>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Amount (₹)"><Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Field label="Payment Date"><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Urgency">
            <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </Select>
          </Field>
        </div>
        <Field label="Remarks (Finance)"><Textarea rows={2} value={remarksFinance} onChange={(e) => setRemarksFinance(e.target.value)} /></Field>
        <Field label="Remarks (Admin)"><Textarea rows={2} value={remarksAdmin} onChange={(e) => setRemarksAdmin(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
