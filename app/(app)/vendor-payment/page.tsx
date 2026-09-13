"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { IndianRupee, AlertTriangle, ListChecks } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete, Tag, Pager } from "@/app/components/ui";
import { C, FONT_HEAD, FONT_BODY, PAGE_SIZE } from "@/app/lib/constants";

interface PaymentRow {
  id: number;
  vendorName: string;
  vendorType: string;
  bankName: string;
  contactDetails: string;
  outstandingAmount: number | null;
  amount: number;
  paymentDate: string;
  paymentType: string;
  approvedAmount: number | null;
  datePaid: string | null;
  urgency: string;
  status: string;
  remarksFinance: string;
  remarksAdmin: string;
}

const BLANK_DRAFT = {
  vendorName: "", vendorType: "", bankName: "", contactDetails: "",
  outstandingAmount: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentType: "NEFT",
  urgency: "Normal", remarksFinance: "",
  approvedAmount: "", datePaid: "", remarksAdmin: "", status: "Open",
};
type Draft = typeof BLANK_DRAFT;

function fmtMoney(n: number | null) {
  if (n == null) return "—";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function UrgencyTag({ value }: { value: string }) {
  return value === "Urgent" ? <Tag color={C.red} bg={C.redSoft}>URGENT</Tag> : <Tag color={C.sub} bg={C.border}>Normal</Tag>;
}
function StatusTag({ value }: { value: string }) {
  return value === "Closed" ? <Tag color={C.green} bg="#E6F1E5">CLOSED</Tag> : <Tag color={C.amber} bg={C.amberSoft}>OPEN</Tag>;
}
// The remaining-outstanding figure is never stored — it's derived live from
// outstandingAmount - approvedAmount every time either changes, so it's
// always correct with no risk of double-subtracting on repeated edits.
function outstandingDisplay(outstanding: number | null, approved: number | null) {
  if (outstanding == null) return "—";
  if (approved == null || approved <= 0) return fmtMoney(outstanding);
  const remaining = Math.max(0, outstanding - approved);
  return `${fmtMoney(outstanding)} → ${fmtMoney(remaining)}`;
}
const cellInput: React.CSSProperties = { padding: "5px 6px", fontSize: 12.5, minWidth: 90 };
const cellInputWide: React.CSSProperties = { ...cellInput, minWidth: 150 };
// Actions (Edit/Approve/Delete) stay visible without scrolling right through
// 14 columns — this is the whole fix for "I couldn't see how to approve":
// the button was always there, just off-screen past Remarks (Admin)/Status.
const stickyActions = (bg: string): React.CSSProperties => ({
  position: "sticky", right: 0, background: bg, boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.18)", zIndex: 1,
});

export default function VendorPaymentPage() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"Open" | "Closed" | "All">("Open");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [approvingRow, setApprovingRow] = useState<PaymentRow | null>(null);
  const [suggestions, setSuggestions] = useState<{ vendorNames: string[]; vendorTypes: string[]; bankNames: string[] }>({ vendorNames: [], vendorTypes: [], bankNames: [] });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter !== "All") p.set("status", statusFilter);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [statusFilter, from, to]);

  const load = () => fetch(`/api/vendor-payment?${qs}`).then((r) => r.json()).then(setRows);
  const loadSuggestions = () => fetch("/api/vendor-payment/suggestions").then((r) => r.json()).then(setSuggestions);

  // Auto-refresh so a status/approval change one side makes shows up on the
  // other without a manual reload — this is the shared link between
  // Sandip's and Admin's logins the whole module is built around.
  useEffect(() => {
    load();
    setPage(1);
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [qs]);
  useEffect(() => {
    loadSuggestions();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/vendor-payment/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  // Split Normal vs Urgent per date, not just a lump sum — so before
  // initiating payments it's clear how much of the day's total is the
  // routine amount vs. what needs to move first.
  const dateTotals = useMemo(() => {
    const map = new Map<string, { normal: number; urgent: number; count: number }>();
    (rows ?? []).filter((r) => r.status === "Open").forEach((r) => {
      const key = r.paymentDate.slice(0, 10);
      const cur = map.get(key) ?? { normal: 0, urgent: 0, count: 0 };
      if (r.urgency === "Urgent") cur.urgent += r.amount; else cur.normal += r.amount;
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const grandNormalTotal = dateTotals.reduce((s, [, v]) => s + v.normal, 0);
  const grandUrgentTotal = dateTotals.reduce((s, [, v]) => s + v.urgent, 0);
  const grandOpenTotal = grandNormalTotal + grandUrgentTotal;
  const openCount = (rows ?? []).filter((r) => r.status === "Open").length;

  const pageRows = (rows ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // So Sandip can tell at a glance "did I already enter today's batch, and
  // how many" instead of scanning a flat list — counted over the full
  // filtered set, not just the current page, since a day's entries won't
  // usually span a page boundary.
  const countsByDate = useMemo(() => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => { const k = r.paymentDate.slice(0, 10); m.set(k, (m.get(k) ?? 0) + 1); });
    return m;
  }, [rows]);

  const saveDraft = async (d: Draft, id?: number) => {
    if (!d.vendorName.trim() || !d.amount || !d.paymentDate) { alert("Vendor Name, Amount and Payment Date are required"); return false; }
    const url = id ? `/api/vendor-payment/${id}` : "/api/vendor-payment";
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, vendorName: d.vendorName.trim() }),
    });
    if (res.ok) { load(); loadSuggestions(); return true; }
    const err = await res.json().catch(() => ({}));
    alert(err.error || "Could not save");
    return false;
  };

  return (
    <div>
      <SectionHead
        title="Vendor Payment"
        sub="Type straight into the grid to raise a request — Admin approves, pays and closes each one"
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatCard icon={IndianRupee} label="Total Pending (Open)" value={fmtMoney(grandOpenTotal)} tint={C.teal} />
        <StatCard icon={ListChecks} label="Normal Pending" value={fmtMoney(grandNormalTotal)} tint={C.sub} />
        <StatCard icon={AlertTriangle} label="Urgent Pending" value={fmtMoney(grandUrgentTotal)} tint={C.red} />
        <StatCard icon={ListChecks} label="Open Requests" value={openCount} tint={C.amber} />
      </div>

      {dateTotals.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Total Requested Per Date (Open only) — Sandip and Admin both see this before initiating payments
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {dateTotals.map(([date, v]) => (
              <div key={date} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", minWidth: 160 }}>
                <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>{fmtDate(date)} · {v.count} request{v.count === 1 ? "" : "s"}</div>
                <div style={{ fontSize: 12.5, color: C.ink }}>Normal: {fmtMoney(v.normal)}</div>
                <div style={{ fontSize: 12.5, color: C.red }}>Urgent: {fmtMoney(v.urgent)}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, marginTop: 2 }}>Total: {fmtMoney(v.normal + v.urgent)}</div>
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

      <datalist id="vp-vendor-names">{suggestions.vendorNames.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="vp-vendor-types">{suggestions.vendorTypes.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="vp-bank-names">{suggestions.bankNames.map((v) => <option key={v} value={v} />)}</datalist>

      {rows === null ? <Empty text="Loading…" /> : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th><Th>Vendor Name</Th><Th>Type</Th><Th>Name as per Bank</Th>
                <Th>Outstanding</Th><Th>Amount</Th><Th>Pay Type</Th><Th>Urgency</Th><Th>Contact</Th><Th>Remarks (Finance)</Th>
                <Th>Approved</Th><Th>Date Paid</Th><Th>Remarks (Admin)</Th><Th>Status</Th><Th style={stickyActions("#fff")} />
              </tr>
            </thead>
            <tbody>
              <AddRow isAdmin={isAdmin} onSave={(d) => saveDraft(d)} />
              {pageRows.map((r, i) => {
                const dateKey = r.paymentDate.slice(0, 10);
                const isNewDateGroup = i === 0 || pageRows[i - 1].paymentDate.slice(0, 10) !== dateKey;
                return (
                  <Fragment key={r.id}>
                    {isNewDateGroup && (
                      <tr>
                        <td colSpan={15} style={{ padding: "8px 12px", background: C.bg, fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${C.border}` }}>
                          {fmtDate(dateKey)} — {countsByDate.get(dateKey) ?? 0} entr{(countsByDate.get(dateKey) ?? 0) === 1 ? "y" : "ies"}
                        </td>
                      </tr>
                    )}
                    <EntryRow row={r} isAdmin={isAdmin} onSave={(d) => saveDraft(d, r.id)} onDelete={() => del(r.id)} onApprove={() => setApprovingRow(r)} />
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
          {rows.length === 0 && <Empty text="No payment requests for this filter yet — add one above." />}
          {rows.length > PAGE_SIZE && <Pager page={page} setPage={setPage} total={rows.length} pageSize={PAGE_SIZE} />}
        </>
      )}

      {/* Rendered at the page level, not inside the table — a fixed-position
          dialog must never nest inside <tbody>/<tr>, which is invalid HTML
          and causes the browser to silently "correct" the DOM in ways that
          can break click targeting elsewhere on the page. */}
      {approvingRow && (
        <ApproveModal
          row={approvingRow}
          onClose={() => setApprovingRow(null)}
          onSave={(d) => saveDraft(d, approvingRow.id)}
        />
      )}
    </div>
  );
}

// One spreadsheet-style row of inputs, always visible above the data —
// type across the fields and hit Enter (or the Add button) to commit; the
// row then clears itself so the next entry can start immediately, no modal.
function AddRow({ isAdmin, onSave }: { isAdmin: boolean; onSave: (d: Draft) => Promise<boolean> }) {
  const [d, setD] = useState<Draft>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    setSaving(true);
    const ok = await onSave(d);
    setSaving(false);
    if (ok) {
      setD({ ...BLANK_DRAFT, paymentDate: d.paymentDate }); // keep the date — batches of entries usually share one day
      // There's no separate "submit" step — saving IS sending it to Admin's
      // queue (status defaults to Open). This confirmation is the only
      // feedback of that, since otherwise the row just silently clears.
      if (!isAdmin) { setJustSent(true); setTimeout(() => setJustSent(false), 2500); }
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };

  // Live feedback the instant Urgent is picked — before saving, not after —
  // same red tint the saved row gets, so there's no surprise later.
  const rowBg = d.urgency === "Urgent" ? C.redSoft : C.tealSoft;

  return (
    <tr style={{ background: rowBg }} onKeyDown={onKeyDown}>
      <Td><Input style={cellInput} type="date" value={d.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} /></Td>
      <Td>
        <Input style={cellInputWide} list="vp-vendor-names" placeholder="Vendor name" value={d.vendorName}
          onChange={(e) => set({ vendorName: e.target.value })}
          onBlur={() => { if (!d.bankName) set({ bankName: d.vendorName }); }} />
      </Td>
      <Td><Input style={cellInputWide} list="vp-vendor-types" placeholder="Type" value={d.vendorType} onChange={(e) => set({ vendorType: e.target.value })} /></Td>
      <Td><Input style={cellInput} list="vp-bank-names" placeholder="Name as per bank" value={d.bankName} onChange={(e) => set({ bankName: e.target.value })} /></Td>
      <Td><Input style={cellInput} type="number" step="any" placeholder="₹" value={d.outstandingAmount} onChange={(e) => set({ outstandingAmount: e.target.value })} /></Td>
      <Td><Input style={{ ...cellInput, fontWeight: 700 }} type="number" step="any" placeholder="₹ required" value={d.amount} onChange={(e) => set({ amount: e.target.value })} /></Td>
      <Td>
        <Select style={cellInput} value={d.paymentType} onChange={(e) => set({ paymentType: e.target.value })}>
          <option value="NEFT">NEFT</option><option value="Cheque">Cheque</option>
        </Select>
      </Td>
      <Td>
        <Select style={cellInput} value={d.urgency} onChange={(e) => set({ urgency: e.target.value })}>
          <option value="Normal">Normal</option><option value="Urgent">Urgent</option>
        </Select>
      </Td>
      <Td><Input style={cellInput} placeholder="Phone" value={d.contactDetails} onChange={(e) => set({ contactDetails: e.target.value })} /></Td>
      <Td><Input style={cellInput} placeholder="Remarks" value={d.remarksFinance} onChange={(e) => set({ remarksFinance: e.target.value })} /></Td>
      {/* Every new entry — created by Sandip or by Admin on his behalf — is
          just a request, Open, with nothing approved yet. Approved/Date
          Paid/Remarks(Admin)/Status are exclusively Admin's domain and
          exist in exactly one place: the "Approve" button/dialog on an
          already-existing row. They never appear at creation time, for
          anyone, so there's no ambiguity about where that work happens. */}
      <Td>{null}</Td><Td>{null}</Td><Td>{null}</Td><Td>{null}</Td>
      <Td style={stickyActions(rowBg)}>
        {justSent
          ? <span style={{ color: C.green, fontWeight: 600, fontSize: 12.5 }}>✓ Sent to Admin</span>
          : <Btn onClick={submit} disabled={saving}>
              {isAdmin ? (saving ? "Adding…" : "Add") : (saving ? "Sending…" : "Send for Approval")}
            </Btn>}
      </Td>
    </tr>
  );
}

function EntryRow({
  row, isAdmin, onSave, onDelete, onApprove,
}: {
  row: PaymentRow; isAdmin: boolean; onSave: (d: Draft) => Promise<boolean>; onDelete: () => void; onApprove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<Draft>(() => rowToDraft(row));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const startEdit = () => { setD(rowToDraft(row)); setEditing(true); };
  const submit = async () => {
    setSaving(true);
    const ok = await onSave(d);
    setSaving(false);
    if (ok) setEditing(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Escape") setEditing(false);
  };

  // Sandip can fix his own request while it's still Open ("before sending
  // it to me") — once Admin closes it, only Admin can still edit/reopen, so
  // a paid/closed record can't quietly change under him.
  const canEdit = isAdmin || row.status === "Open";

  if (!editing) {
    const rowBg = row.urgency === "Urgent" ? C.redSoft : "#fff";
    return (
      <tr style={{ background: rowBg === "#fff" ? undefined : rowBg }}>
        <Td>{fmtDate(row.paymentDate)}</Td>
        <Td>{row.vendorName}</Td>
        <Td>{row.vendorType || "—"}</Td>
        <Td>{row.bankName || "—"}</Td>
        <Td>{outstandingDisplay(row.outstandingAmount, row.approvedAmount)}</Td>
        <Td>{fmtMoney(row.amount)}</Td>
        <Td>{row.paymentType}</Td>
        <Td><UrgencyTag value={row.urgency} /></Td>
        <Td>{row.contactDetails || "—"}</Td>
        <Td>{row.remarksFinance || "—"}</Td>
        <Td>{fmtMoney(row.approvedAmount)}</Td>
        <Td>{fmtDate(row.datePaid)}</Td>
        <Td>{row.remarksAdmin || "—"}</Td>
        <Td><StatusTag value={row.status} /></Td>
        <Td style={stickyActions(rowBg)}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isAdmin && row.status === "Open" && (
              <Btn onClick={onApprove} style={{ padding: "5px 10px" }}>Approve</Btn>
            )}
            {canEdit
              ? <button onClick={startEdit} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
              : <span style={{ color: C.faint, fontSize: 12 }}>Closed</span>}
            {isAdmin && <ConfirmDelete onConfirm={onDelete} />}
          </div>
        </Td>
      </tr>
    );
  }

  const rowBg = d.urgency === "Urgent" ? C.redSoft : C.amberSoft;

  return (
    <tr style={{ background: rowBg }} onKeyDown={onKeyDown}>
      <Td><Input style={cellInput} type="date" value={d.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} /></Td>
      <Td><Input style={cellInputWide} list="vp-vendor-names" value={d.vendorName} onChange={(e) => set({ vendorName: e.target.value })} /></Td>
      <Td><Input style={cellInputWide} list="vp-vendor-types" value={d.vendorType} onChange={(e) => set({ vendorType: e.target.value })} /></Td>
      <Td><Input style={cellInput} list="vp-bank-names" value={d.bankName} onChange={(e) => set({ bankName: e.target.value })} /></Td>
      <Td><Input style={cellInput} type="number" step="any" value={d.outstandingAmount} onChange={(e) => set({ outstandingAmount: e.target.value })} /></Td>
      <Td><Input style={cellInput} type="number" step="any" value={d.amount} onChange={(e) => set({ amount: e.target.value })} /></Td>
      <Td>
        <Select style={cellInput} value={d.paymentType} onChange={(e) => set({ paymentType: e.target.value })}>
          <option value="NEFT">NEFT</option><option value="Cheque">Cheque</option>
        </Select>
      </Td>
      <Td>
        <Select style={cellInput} value={d.urgency} onChange={(e) => set({ urgency: e.target.value })}>
          <option value="Normal">Normal</option><option value="Urgent">Urgent</option>
        </Select>
      </Td>
      <Td><Input style={cellInput} value={d.contactDetails} onChange={(e) => set({ contactDetails: e.target.value })} /></Td>
      <Td><Input style={cellInput} value={d.remarksFinance} onChange={(e) => set({ remarksFinance: e.target.value })} /></Td>
      {isAdmin ? (
        <>
          <Td>
            <Input style={cellInput} type="number" step="any" value={d.approvedAmount} onChange={(e) => set({ approvedAmount: e.target.value })} />
            {d.outstandingAmount && d.approvedAmount && (
              <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>Bal: {outstandingDisplay(Number(d.outstandingAmount), Number(d.approvedAmount)).split("→")[1] ?? ""}</div>
            )}
          </Td>
          <Td><Input style={cellInput} type="date" value={d.datePaid} onChange={(e) => set({ datePaid: e.target.value })} /></Td>
          <Td><Input style={cellInput} value={d.remarksAdmin} onChange={(e) => set({ remarksAdmin: e.target.value })} /></Td>
          <Td>
            <Select style={cellInput} value={d.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="Open">Open</option><option value="Closed">Closed</option>
            </Select>
          </Td>
        </>
      ) : (
        <>
          <Td>{fmtMoney(row.approvedAmount)}</Td><Td>{fmtDate(row.datePaid)}</Td><Td>{row.remarksAdmin || "—"}</Td><Td><StatusTag value={row.status} /></Td>
        </>
      )}
      <Td style={stickyActions(rowBg)}>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={submit} disabled={saving} style={{ padding: "5px 10px" }}>{saving ? "…" : "Save"}</Btn>
          <Btn variant="ghost" onClick={() => setEditing(false)} style={{ padding: "5px 10px" }}>Cancel</Btn>
        </div>
      </Td>
    </tr>
  );
}

// Admin's dedicated, hard-to-miss approve-and-pay action — a focused dialog
// instead of scrolling the wide grid to find the four admin-only cells at
// the far right. Pre-fills Approved Amount from the requested amount and
// Date Paid with today, both still editable (partial/short payments, or a
// backdated entry, happen per the source data).
function ApproveModal({ row, onClose, onSave }: { row: PaymentRow; onClose: () => void; onSave: (d: Draft) => Promise<boolean> }) {
  const [approvedAmount, setApprovedAmount] = useState(row.approvedAmount != null ? String(row.approvedAmount) : String(row.amount));
  const [datePaid, setDatePaid] = useState(row.datePaid ? row.datePaid.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [remarksAdmin, setRemarksAdmin] = useState(row.remarksAdmin);
  const [status, setStatus] = useState<"Open" | "Closed">("Closed");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const ok = await onSave({ ...rowToDraft(row), approvedAmount, datePaid, remarksAdmin, status });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title={`Approve & Pay — ${row.vendorName}`} onClose={onClose} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: C.sub }}>
          Requested {fmtMoney(row.amount)} for {fmtDate(row.paymentDate)}
          {row.outstandingAmount != null ? ` — outstanding ${fmtMoney(row.outstandingAmount)}` : ""}
          {row.remarksFinance ? ` — "${row.remarksFinance}"` : ""}
        </div>
        <Field label="Approved / Paid Amount (₹)"><Input type="number" step="any" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} /></Field>
        <Field label="Date Paid"><Input type="date" value={datePaid} onChange={(e) => setDatePaid(e.target.value)} /></Field>
        <Field label="Remarks (Admin)"><Textarea rows={2} value={remarksAdmin} onChange={(e) => setRemarksAdmin(e.target.value)} /></Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "Open" | "Closed")}>
            <option value="Closed">Closed — paid</option>
            <option value="Open">Keep Open (just record progress)</option>
          </Select>
        </Field>
        {approvedAmount && row.outstandingAmount != null && (
          <div style={{ fontSize: 12.5, color: C.sub }}>Outstanding after this payment: {outstandingDisplay(row.outstandingAmount, Number(approvedAmount)).split("→")[1] ?? fmtMoney(row.outstandingAmount)}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function rowToDraft(row: PaymentRow): Draft {
  return {
    vendorName: row.vendorName, vendorType: row.vendorType, bankName: row.bankName, contactDetails: row.contactDetails,
    outstandingAmount: row.outstandingAmount != null ? String(row.outstandingAmount) : "",
    amount: String(row.amount), paymentDate: row.paymentDate.slice(0, 10), paymentType: row.paymentType,
    urgency: row.urgency, remarksFinance: row.remarksFinance,
    approvedAmount: row.approvedAmount != null ? String(row.approvedAmount) : "",
    datePaid: row.datePaid ? row.datePaid.slice(0, 10) : "", remarksAdmin: row.remarksAdmin, status: row.status,
  };
}
