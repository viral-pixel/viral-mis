"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Upload, IndianRupee, ListChecks } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete, Tag } from "@/app/components/ui";
import { C } from "@/app/lib/constants";
import { RENT_TYPE_OF_PAY_SUGGESTIONS, RENT_MODE_OF_PAY_OPTIONS } from "@/app/lib/monthlyRentMeta";

function fmtMoney(n: number | null) {
  if (n == null) return "—";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function thisMonthStr() {
  return new Date().toISOString().slice(0, 7);
}
function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}
function StatusTag({ value }: { value: string }) {
  return value === "ACTIVE"
    ? <Tag color={C.green} bg="#E6F1E5">ACTIVE</Tag>
    : <Tag color={C.sub} bg={C.border}>NOT ACTIVE</Tag>;
}
function PaymentStatusTag({ value }: { value: string }) {
  return value === "Closed" ? <Tag color={C.green} bg="#E6F1E5">CLOSED</Tag> : <Tag color={C.amber} bg={C.amberSoft}>OPEN</Tag>;
}

interface PartyRow {
  id: number; srNo: number | null; partyName: string; siteName: string; typeOfPay: string;
  amount: number | null; tdsDeduction: number; netPay: number | null; modeOfPay: string; approxDateOfPay: string;
  mobileNo: string; status: string; depositDate: string | null; depositAmount: number | null; remarks: string;
}
interface PaymentRow {
  id: number; partyId: number; party: PartyRow; dueDate: string; rentMonth: string; proposedAmount: number; remarksRequester: string;
  raisedByName: string; raisedAt: string; status: string; paidAmount: number | null; datePaid: string | null;
  remarksAdmin: string; paidBy: string;
}

const SEEN_OPEN_IDS_KEY = "mr-seen-open-ids";

export default function MonthlyRentPage() {
  const [tab, setTab] = useState<"parties" | "payments" | "history">("parties");
  const [parties, setParties] = useState<PartyRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const loadParties = () => fetch("/api/monthly-rent/parties").then((r) => { if (r.status === 403) { setForbidden(true); return null; } return r.json(); }).then((d) => d && setParties(d));
  const loadPayments = () => fetch("/api/monthly-rent/payments").then((r) => r.json()).then(setPayments);

  useEffect(() => {
    loadParties();
    loadPayments();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  // Keeps the requests list current even if Admin is sitting on a different
  // tab (Rent Parties, History) when Ketan or Sandip sends one.
  useEffect(() => {
    const id = setInterval(loadPayments, 20000);
    return () => clearInterval(id);
  }, []);

  const pushToast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 7000);
  };

  // Admin-only: "when he sends the request that should come to me for
  // approval" (2026-09-24) — a toast the moment a new Open request shows up,
  // independent of whichever tab Admin currently has open. Same pattern as
  // Vendor Payment's watcher.
  useEffect(() => {
    if (!isAdmin) return;
    let seenIds: Set<number> | null = null;
    try {
      const stored = localStorage.getItem(SEEN_OPEN_IDS_KEY);
      if (stored) seenIds = new Set(JSON.parse(stored));
    } catch { /* localStorage unavailable — treat as first run */ }

    const check = async () => {
      const res = await fetch("/api/monthly-rent/payments?status=Open");
      if (!res.ok) return;
      const openRows: PaymentRow[] = await res.json();
      const currentIds = new Set(openRows.map((r) => r.id));

      if (seenIds) {
        const newOnes = openRows.filter((r) => !seenIds!.has(r.id));
        for (const r of newOnes) {
          pushToast(`New rent payment request: ${r.party.partyName} — ${fmtMoney(r.proposedAmount)} (${fmtMonth(r.rentMonth)})`);
        }
      }
      seenIds = currentIds;
      try { localStorage.setItem(SEEN_OPEN_IDS_KEY, JSON.stringify([...currentIds])); } catch { /* ignore */ }
    };

    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (forbidden) return <Empty text="Not authorized — Monthly Rent is only visible to Admin, Ketan and Sandip." />;

  const activeCount = (parties ?? []).filter((p) => p.status === "ACTIVE").length;
  const openCount = (payments ?? []).filter((p) => p.status === "Open").length;
  const openTotal = (payments ?? []).filter((p) => p.status === "Open").reduce((s, p) => s + p.proposedAmount, 0);

  return (
    <div>
      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 100, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
          {toasts.map((t) => (
            <div key={t.id} style={{ background: C.ink, color: "#fff", padding: "12px 14px", borderRadius: 8, fontSize: 13, boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}>
              {t.text}
            </div>
          ))}
        </div>
      )}
      <SectionHead
        title="Monthly Rent"
        sub="Landlord/tenancy master and the payment cycle — raise for payment, Admin approves & pays. Visible only to Admin, Ketan and Sandip."
      />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatCard icon={ListChecks} label="Active Parties" value={activeCount} tint={C.teal} />
        <StatCard icon={IndianRupee} label="Pending Payments (Open)" value={fmtMoney(openTotal)} tint={C.amber} />
        <StatCard icon={ListChecks} label="Open Requests" value={openCount} tint={C.sub} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {([["parties", "Rent Parties"], ["payments", "Payment Requests"], ["history", "Payment History (FY)"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              background: tab === key ? C.teal : "#fff", color: tab === key ? "#fff" : C.ink,
              border: `1px solid ${tab === key ? C.teal : C.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "parties" && <PartiesTab parties={parties} isAdmin={isAdmin} onChanged={loadParties} />}
      {tab === "payments" && <PaymentsTab payments={payments} parties={parties ?? []} isAdmin={isAdmin} onChanged={loadPayments} />}
      {tab === "history" && <HistoryTab payments={payments} />}
    </div>
  );
}

// ---------- Rent Parties tab ----------
function PartiesTab({ parties, isAdmin, onChanged }: { parties: PartyRow[] | null; isAdmin: boolean; onChanged: () => void }) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "NOT ACTIVE">("ACTIVE");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PartyRow | null>(null);

  const rows = (parties ?? []).filter((p) => statusFilter === "ALL" || p.status === statusFilter);

  const del = async (id: number) => {
    const res = await fetch(`/api/monthly-rent/parties/${id}`, { method: "DELETE" });
    if (res.ok) onChanged(); else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not delete"); }
  };

  const doImport = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/monthly-rent/parties/import", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { alert(`Imported: ${d.created} created, ${d.updated} updated.${d.errors?.length ? ` ${d.errors.length} error(s).` : ""}`); onChanged(); }
    else alert(d.error || "Import failed");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={{ width: 180 }}>
          <option value="ACTIVE">Active only</option>
          <option value="NOT ACTIVE">Not Active only</option>
          <option value="ALL">All</option>
        </Select>
        <div style={{ display: "flex", gap: 6 }}>
          <a href="/api/monthly-rent/parties/export" style={{ textDecoration: "none" }}>
            <Btn variant="ghost"><Download size={15} /> Export Excel</Btn>
          </a>
          <label style={{ display: "inline-flex" }}>
            <Btn variant="ghost" onClick={() => document.getElementById("rent-import-input")?.click()}>
              <Upload size={15} /> Import Excel
            </Btn>
            <input
              id="rent-import-input" type="file" accept=".xlsx,.xls" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }}
            />
          </label>
          <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add Party</Btn>
        </div>
      </div>

      {parties === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No parties for this filter." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Party Name</Th><Th>Site</Th><Th>Type of Pay</Th><Th style={{ textAlign: "right" }}>Amount</Th>
              <Th style={{ textAlign: "right" }}>TDS</Th><Th style={{ textAlign: "right" }}>Net Pay</Th><Th>Mode</Th>
              <Th>Approx Date of Pay</Th><Th>Mobile</Th><Th>Status</Th><Th>Deposit</Th><Th>Remarks</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>{p.partyName}</Td>
                <Td>{p.siteName || "—"}</Td>
                <Td>{p.typeOfPay || "—"}</Td>
                <Td style={{ textAlign: "right" }}>{fmtMoney(p.amount)}</Td>
                <Td style={{ textAlign: "right" }}>{fmtMoney(p.tdsDeduction)}</Td>
                <Td style={{ textAlign: "right", fontWeight: 600 }}>{fmtMoney(p.netPay)}</Td>
                <Td>{p.modeOfPay || "—"}</Td>
                <Td>{p.approxDateOfPay || "—"}</Td>
                <Td>{p.mobileNo || "—"}</Td>
                <Td><StatusTag value={p.status} /></Td>
                <Td>{p.depositAmount != null ? `${fmtMoney(p.depositAmount)} (${fmtDate(p.depositDate)})` : "—"}</Td>
                <Td style={{ color: C.sub }}>{p.remarks || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setEditing(p)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(p.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {showAdd && <PartyForm onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onChanged(); }} />}
      {editing && <PartyForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
}

function PartyForm({ initial, onClose, onSaved }: { initial?: PartyRow; onClose: () => void; onSaved: () => void }) {
  const [partyName, setPartyName] = useState(initial?.partyName ?? "");
  const [siteName, setSiteName] = useState(initial?.siteName ?? "");
  const [typeOfPay, setTypeOfPay] = useState(initial?.typeOfPay ?? "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [tdsDeduction, setTdsDeduction] = useState(initial ? String(initial.tdsDeduction) : "0");
  const [netPay, setNetPay] = useState(initial?.netPay != null ? String(initial.netPay) : "");
  const [modeOfPay, setModeOfPay] = useState(initial?.modeOfPay ?? "Net Banking");
  const [approxDateOfPay, setApproxDateOfPay] = useState(initial?.approxDateOfPay ?? "");
  const [mobileNo, setMobileNo] = useState(initial?.mobileNo ?? "");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [depositDate, setDepositDate] = useState(initial?.depositDate ? initial.depositDate.slice(0, 10) : "");
  const [depositAmount, setDepositAmount] = useState(initial?.depositAmount != null ? String(initial.depositAmount) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/monthly-rent/parties/${initial.id}` : "/api/monthly-rent/parties";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyName, siteName, typeOfPay, amount, tdsDeduction, netPay, modeOfPay, approxDateOfPay, mobileNo, status, depositDate, depositAmount, remarks }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Rent Party" : "Add Rent Party"} onClose={onClose} width={520}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Party Name"><Input required value={partyName} onChange={(e) => setPartyName(e.target.value)} /></Field>
          <Field label="Site Name"><Input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Type of Pay">
            <Input list="rent-type-of-pay" value={typeOfPay} onChange={(e) => setTypeOfPay(e.target.value)} />
            <datalist id="rent-type-of-pay">{RENT_TYPE_OF_PAY_SUGGESTIONS.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Mode of Pay">
            <Select value={modeOfPay} onChange={(e) => setModeOfPay(e.target.value)}>
              {RENT_MODE_OF_PAY_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Amount (₹)"><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="TDS Deduction (₹)"><Input type="number" step="0.01" value={tdsDeduction} onChange={(e) => setTdsDeduction(e.target.value)} /></Field>
          <Field label="Net Pay (₹)"><Input type="number" step="0.01" value={netPay} onChange={(e) => setNetPay(e.target.value)} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Approx Date of Pay"><Input value={approxDateOfPay} onChange={(e) => setApproxDateOfPay(e.target.value)} placeholder="e.g. 5 to 10 of Month" /></Field>
          <Field label="Mobile No."><Input value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} /></Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="NOT ACTIVE">NOT ACTIVE</option>
          </Select>
        </Field>
        <div style={{ background: C.tealSoft, border: `1px solid ${C.teal}55`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Deposit (for future reference — not in the source sheet)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Deposit Date"><Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} /></Field>
            <Field label="Deposit Amount (₹)"><Input type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} /></Field>
          </div>
        </div>
        <Field label="Remarks (optional)"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Payment Requests tab ----------
// Simplified per the user's explicit direction (2026-09-24): no modal, no
// party dropdown to hunt through — every party in the chosen status
// populates as its own pre-filled row (mirrors how Ketan worked in Excel:
// everyone visible side by side, type the amount, add a remark, send).
function PaymentsTab({ payments, parties, isAdmin, onChanged }: { payments: PaymentRow[] | null; parties: PartyRow[]; isAdmin: boolean; onChanged: () => void }) {
  const [raiseFilter, setRaiseFilter] = useState<"ACTIVE" | "NOT ACTIVE">("ACTIVE");
  const [statusFilter, setStatusFilter] = useState<"Open" | "Closed" | "All">("Open");
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [approving, setApproving] = useState<PaymentRow | null>(null);

  const raiseParties = useMemo(() => parties.filter((p) => p.status === raiseFilter), [parties, raiseFilter]);

  // Last paid amount per party — read straight off the already-loaded
  // requests list (most recent Closed one by rentMonth), so Ketan/Sandip
  // can see it right next to where they're raising the next one, no extra
  // lookup or page to open.
  const lastPaidByParty = useMemo(() => {
    const map = new Map<number, PaymentRow>();
    for (const p of payments ?? []) {
      if (p.status !== "Closed" || p.paidAmount == null) continue;
      const cur = map.get(p.partyId);
      if (!cur || p.rentMonth > cur.rentMonth) map.set(p.partyId, p);
    }
    return map;
  }, [payments]);

  const rows = useMemo(() => (payments ?? []).filter((p) => statusFilter === "All" || p.status === statusFilter), [payments, statusFilter]);

  const del = async (id: number) => {
    const res = await fetch(`/api/monthly-rent/payments/${id}`, { method: "DELETE" });
    if (res.ok) onChanged(); else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not delete"); }
  };

  return (
    <div>
      <div style={{ marginBottom: 10, fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Send for Payment
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["ACTIVE", "NOT ACTIVE"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setRaiseFilter(s)}
            style={{
              padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: raiseFilter === s ? C.teal : "#fff", color: raiseFilter === s ? "#fff" : C.ink,
              border: `1px solid ${raiseFilter === s ? C.teal : C.border}`,
            }}
          >
            {s === "ACTIVE" ? "Active" : "Not Active"}
          </button>
        ))}
      </div>

      {raiseParties.length === 0 ? <Empty text={`No ${raiseFilter === "ACTIVE" ? "active" : "not active"} parties.`} /> : (
        <Table>
          <thead>
            <tr>
              <Th>Party</Th><Th>Site</Th><Th>Last Month Paid</Th><Th>Rent For Month Of</Th>
              <Th style={{ textAlign: "right" }}>Amount (₹)</Th><Th>Remarks</Th><Th />
            </tr>
          </thead>
          <tbody>
            {raiseParties.map((p) => (
              <RaiseRow key={p.id} party={p} lastPaid={lastPaidByParty.get(p.id) ?? null} onSent={onChanged} />
            ))}
          </tbody>
        </Table>
      )}

      <div style={{ marginTop: 26, marginBottom: 10, fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Sent Requests
      </div>
      <div style={{ marginBottom: 12 }}>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={{ width: 160 }}>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
          <option value="All">All</option>
        </Select>
      </div>

      {payments === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No payment requests for this filter." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Rent For</Th><Th>Party</Th><Th>Site</Th><Th style={{ textAlign: "right" }}>Proposed</Th>
              <Th>Requester Remarks</Th><Th>Raised By</Th><Th style={{ textAlign: "right" }}>Paid</Th>
              <Th>Date Paid</Th><Th>Admin Remarks</Th><Th>Status</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>{fmtMonth(p.rentMonth)}</Td>
                <Td>{p.party.partyName}</Td>
                <Td>{p.party.siteName || "—"}</Td>
                <Td style={{ textAlign: "right" }}>{fmtMoney(p.proposedAmount)}</Td>
                <Td style={{ color: C.sub }}>{p.remarksRequester || "—"}</Td>
                <Td>{p.raisedByName || "—"}</Td>
                <Td style={{ textAlign: "right", fontWeight: 600 }}>{fmtMoney(p.paidAmount)}</Td>
                <Td>{fmtDate(p.datePaid)}</Td>
                <Td style={{ color: C.sub }}>{p.remarksAdmin || "—"}</Td>
                <Td><PaymentStatusTag value={p.status} /></Td>
                <Td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isAdmin && p.status === "Open" && <Btn onClick={() => setApproving(p)} style={{ padding: "5px 10px" }}>Approve & Pay</Btn>}
                    {(isAdmin || p.status === "Open") && (
                      <button onClick={() => setEditing(p)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    )}
                    {isAdmin && <ConfirmDelete onConfirm={() => del(p.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <PaymentEditModal parties={parties} row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {approving && <ApproveModal row={approving} onClose={() => setApproving(null)} onSaved={() => { setApproving(null); onChanged(); }} />}
    </div>
  );
}

// One row per party, always visible, pre-filled — type the amount/remarks
// and hit Send. Resets itself (keeping the chosen month) after sending so
// the next one can go straight away, same spirit as Vendor Payment's grid.
function RaiseRow({ party, lastPaid, onSent }: { party: PartyRow; lastPaid: PaymentRow | null; onSent: () => void }) {
  const [rentMonth, setRentMonth] = useState(thisMonthStr());
  const [amount, setAmount] = useState(party.netPay != null ? String(party.netPay) : "");
  const [remarks, setRemarks] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const send = async () => {
    if (!amount) { alert("Enter an amount"); return; }
    setSending(true);
    const res = await fetch("/api/monthly-rent/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId: party.id, rentMonth, proposedAmount: amount, remarksRequester: remarks }),
    });
    setSending(false);
    if (res.ok) {
      setRemarks("");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
      onSent();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not send");
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); send(); } };

  return (
    <tr onKeyDown={onKeyDown}>
      <Td>{party.partyName}</Td>
      <Td>{party.siteName || "—"}</Td>
      <Td style={{ color: C.sub }}>
        {lastPaid ? `${fmtMoney(lastPaid.paidAmount)} (${fmtMonth(lastPaid.rentMonth)})` : "—"}
      </Td>
      <Td><Input type="month" style={{ padding: "5px 6px", fontSize: 12.5, minWidth: 120 }} value={rentMonth} onChange={(e) => setRentMonth(e.target.value)} /></Td>
      <Td><Input type="number" step="0.01" style={{ padding: "5px 6px", fontSize: 12.5, minWidth: 90, fontWeight: 700 }} value={amount} onChange={(e) => setAmount(e.target.value)} /></Td>
      <Td><Input placeholder="Remarks" style={{ padding: "5px 6px", fontSize: 12.5, minWidth: 140 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Td>
      <Td>
        {justSent
          ? <span style={{ color: C.green, fontWeight: 600, fontSize: 12.5 }}>✓ Sent</span>
          : <Btn onClick={send} disabled={sending} style={{ padding: "5px 10px" }}>{sending ? "Sending…" : "Send"}</Btn>}
      </Td>
    </tr>
  );
}

// Edit-only now (raising happens inline above) — party list is the full
// roster, not just active, so an old request tied to a since-inactive
// party still edits correctly.
function PaymentEditModal({ parties, row, onClose, onSaved }: { parties: PartyRow[]; row: PaymentRow; onClose: () => void; onSaved: () => void }) {
  const [partyId, setPartyId] = useState(String(row.partyId));
  const [rentMonth, setRentMonth] = useState(row.rentMonth.slice(0, 7));
  const [dueDate, setDueDate] = useState(row.dueDate.slice(0, 10));
  const [proposedAmount, setProposedAmount] = useState(String(row.proposedAmount));
  const [remarksRequester, setRemarksRequester] = useState(row.remarksRequester);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/monthly-rent/payments/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId, rentMonth, dueDate, proposedAmount, remarksRequester }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title="Edit Payment Request" onClose={onClose} width={440}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Party">
          <Select required value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.partyName} — {p.siteName} {p.status === "NOT ACTIVE" ? "(Not Active)" : ""}</option>)}
          </Select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Rent For Month Of"><Input type="month" required value={rentMonth} onChange={(e) => setRentMonth(e.target.value)} /></Field>
          <Field label="Due Date"><Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>
        <Field label="Proposed Amount (₹)"><Input type="number" step="0.01" required value={proposedAmount} onChange={(e) => setProposedAmount(e.target.value)} /></Field>
        <Field label="Remarks (deduct/add adjustments etc.)"><Textarea rows={2} value={remarksRequester} onChange={(e) => setRemarksRequester(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function ApproveModal({ row, onClose, onSaved }: { row: PaymentRow; onClose: () => void; onSaved: () => void }) {
  const [paidAmount, setPaidAmount] = useState(row.paidAmount != null ? String(row.paidAmount) : String(row.proposedAmount));
  const [datePaid, setDatePaid] = useState(row.datePaid ? row.datePaid.slice(0, 10) : todayStr());
  const [remarksAdmin, setRemarksAdmin] = useState(row.remarksAdmin);
  const [status, setStatus] = useState<"Open" | "Closed">("Closed");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await fetch(`/api/monthly-rent/payments/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partyId: row.partyId, rentMonth: row.rentMonth.slice(0, 7), dueDate: row.dueDate, proposedAmount: row.proposedAmount, remarksRequester: row.remarksRequester,
        paidAmount, datePaid, remarksAdmin, status,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not save"); }
  };

  return (
    <Modal title={`Approve & Pay — ${row.party.partyName}`} onClose={onClose} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: C.sub }}>
          Rent for {fmtMonth(row.rentMonth)} — proposed {fmtMoney(row.proposedAmount)}
          {row.remarksRequester ? ` — "${row.remarksRequester}"` : ""}
        </div>
        <Field label="Paid Amount (₹)"><Input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} /></Field>
        <Field label="Date Paid"><Input type="date" value={datePaid} onChange={(e) => setDatePaid(e.target.value)} /></Field>
        <Field label="Remarks (Admin)"><Textarea rows={2} value={remarksAdmin} onChange={(e) => setRemarksAdmin(e.target.value)} /></Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "Open" | "Closed")}>
            <option value="Closed">Closed — paid</option>
            <option value="Open">Keep Open (just record progress)</option>
          </Select>
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Payment History (FY) tab ----------
// Financial year = Apr-Mar (India). "Total amount tracking" per the user's
// explicit request (2026-09-24) — how much actually moved to each party,
// per FY, at a glance, not just this month's queue.
function fyLabel(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const startYear = d.getUTCMonth() >= 3 ? y : y - 1; // getUTCMonth() 0-11, April = 3
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function currentFyLabel(): string {
  return fyLabel(new Date().toISOString());
}

function HistoryTab({ payments }: { payments: PaymentRow[] | null }) {
  const { fys, partyRowsByFy, fyTotals, grandTotal } = useMemo(() => {
    const closed = (payments ?? []).filter((p) => p.status === "Closed" && p.paidAmount != null);
    const fySet = new Set<string>();
    const byFyParty = new Map<string, Map<number, { name: string; site: string; amount: number }>>();
    const byFy = new Map<string, number>();
    let grand = 0;

    for (const p of closed) {
      const fy = fyLabel(p.datePaid ?? p.rentMonth);
      fySet.add(fy);
      const amt = p.paidAmount ?? 0;

      const partiesForFy = byFyParty.get(fy) ?? new Map<number, { name: string; site: string; amount: number }>();
      const rec = partiesForFy.get(p.partyId) ?? { name: p.party.partyName, site: p.party.siteName, amount: 0 };
      rec.amount += amt;
      partiesForFy.set(p.partyId, rec);
      byFyParty.set(fy, partiesForFy);

      byFy.set(fy, (byFy.get(fy) ?? 0) + amt);
      grand += amt;
    }

    const fys = [...fySet].sort();
    const partyRowsByFy = new Map<string, { name: string; site: string; amount: number }[]>();
    for (const [fy, parties] of byFyParty) {
      partyRowsByFy.set(fy, [...parties.values()].sort((a, b) => b.amount - a.amount));
    }
    return { fys, partyRowsByFy, fyTotals: byFy, grandTotal: grand };
  }, [payments]);

  const [selectedFy, setSelectedFy] = useState<string>(currentFyLabel());

  useEffect(() => {
    if (fys.length > 0 && !fys.includes(selectedFy)) setSelectedFy(fys[fys.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fys.join(",")]);

  if (payments === null) return <Empty text="Loading…" />;
  if (fys.length === 0) return <Empty text="No closed (paid) requests yet — totals will build up here as payments are made." />;

  const rows = partyRowsByFy.get(selectedFy) ?? [];
  const totalForFy = fyTotals.get(selectedFy) ?? 0;

  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 18 }}>
        <Field label="Financial Year">
          <Select value={selectedFy} onChange={(e) => setSelectedFy(e.target.value)} style={{ width: 160 }}>
            {fys.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
          </Select>
        </Field>
        <StatCard icon={IndianRupee} label={`Total Paid — ${selectedFy}`} value={fmtMoney(totalForFy)} tint={C.teal} />
        <StatCard icon={ListChecks} label="Parties Paid" value={rows.length} tint={C.sub} />
      </div>

      <div style={{ marginBottom: 10, fontSize: 13, color: C.sub }}>
        Amount actually paid per party for {selectedFy} (Apr–Mar) — from Closed requests only.
      </div>
      {rows.length === 0 ? <Empty text={`No payments closed in ${selectedFy}.`} /> : (
        <Table>
          <thead><tr><Th>Party</Th><Th>Site</Th><Th style={{ textAlign: "right" }}>Amount Paid</Th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name + p.site}>
                <Td>{p.name}</Td>
                <Td>{p.site || "—"}</Td>
                <Td style={{ textAlign: "right" }}>{fmtMoney(p.amount)}</Td>
              </tr>
            ))}
            <tr>
              <Td style={{ fontWeight: 700 }}>Total</Td><Td>{""}</Td>
              <Td style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(totalForFy)}</Td>
            </tr>
          </tbody>
        </Table>
      )}

      {fys.length > 1 && (
        <div style={{ marginTop: 10, fontSize: 12, color: C.sub }}>
          Grand total across all {fys.length} financial years on record: {fmtMoney(grandTotal)}
        </div>
      )}
    </div>
  );
}
