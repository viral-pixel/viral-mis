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
  id: number; partyId: number; party: PartyRow; dueDate: string; proposedAmount: number; remarksRequester: string;
  raisedByName: string; raisedAt: string; status: string; paidAmount: number | null; datePaid: string | null;
  remarksAdmin: string; paidBy: string;
}

export default function MonthlyRentPage() {
  const [tab, setTab] = useState<"parties" | "payments">("parties");
  const [parties, setParties] = useState<PartyRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const loadParties = () => fetch("/api/monthly-rent/parties").then((r) => { if (r.status === 403) { setForbidden(true); return null; } return r.json(); }).then((d) => d && setParties(d));
  const loadPayments = () => fetch("/api/monthly-rent/payments").then((r) => r.json()).then(setPayments);

  useEffect(() => {
    loadParties();
    loadPayments();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  if (forbidden) return <Empty text="Not authorized — Monthly Rent is only visible to Admin, Ketan and Sandip." />;

  const activeCount = (parties ?? []).filter((p) => p.status === "ACTIVE").length;
  const openCount = (payments ?? []).filter((p) => p.status === "Open").length;
  const openTotal = (payments ?? []).filter((p) => p.status === "Open").reduce((s, p) => s + p.proposedAmount, 0);

  return (
    <div>
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
        {([["parties", "Rent Parties"], ["payments", "Payment Requests"]] as const).map(([key, label]) => (
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
      {tab === "payments" && <PaymentsTab payments={payments} parties={(parties ?? []).filter((p) => p.status === "ACTIVE")} isAdmin={isAdmin} onChanged={loadPayments} />}
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
function PaymentsTab({ payments, parties, isAdmin, onChanged }: { payments: PaymentRow[] | null; parties: PartyRow[]; isAdmin: boolean; onChanged: () => void }) {
  const [statusFilter, setStatusFilter] = useState<"Open" | "Closed" | "All">("Open");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [approving, setApproving] = useState<PaymentRow | null>(null);

  const rows = useMemo(() => (payments ?? []).filter((p) => statusFilter === "All" || p.status === statusFilter), [payments, statusFilter]);

  const del = async (id: number) => {
    const res = await fetch(`/api/monthly-rent/payments/${id}`, { method: "DELETE" });
    if (res.ok) onChanged(); else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not delete"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={{ width: 160 }}>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
          <option value="All">All</option>
        </Select>
        <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Send for Payment</Btn>
      </div>

      {payments === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No payment requests for this filter." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Due Date</Th><Th>Party</Th><Th>Site</Th><Th style={{ textAlign: "right" }}>Proposed</Th>
              <Th>Requester Remarks</Th><Th>Raised By</Th><Th style={{ textAlign: "right" }}>Paid</Th>
              <Th>Date Paid</Th><Th>Admin Remarks</Th><Th>Status</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>{fmtDate(p.dueDate)}</Td>
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

      {showAdd && <PaymentForm parties={parties} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onChanged(); }} />}
      {editing && <PaymentForm parties={parties} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {approving && <ApproveModal row={approving} onClose={() => setApproving(null)} onSaved={() => { setApproving(null); onChanged(); }} />}
    </div>
  );
}

function PaymentForm({ parties, initial, onClose, onSaved }: { parties: PartyRow[]; initial?: PaymentRow; onClose: () => void; onSaved: () => void }) {
  const [partyId, setPartyId] = useState(initial ? String(initial.partyId) : parties[0] ? String(parties[0].id) : "");
  const [dueDate, setDueDate] = useState(initial?.dueDate.slice(0, 10) ?? todayStr());
  const [proposedAmount, setProposedAmount] = useState(initial ? String(initial.proposedAmount) : "");
  const [remarksRequester, setRemarksRequester] = useState(initial?.remarksRequester ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const applyPartyDefault = (id: string) => {
    setPartyId(id);
    if (!initial) {
      const p = parties.find((x) => String(x.id) === id);
      if (p?.netPay != null) setProposedAmount(String(p.netPay));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/monthly-rent/payments/${initial.id}` : "/api/monthly-rent/payments";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId, dueDate, proposedAmount, remarksRequester }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Payment Request" : "Send for Payment"} onClose={onClose} width={440}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Party (active only)">
          <Select required value={partyId} onChange={(e) => applyPartyDefault(e.target.value)}>
            {parties.length === 0 && <option value="">No active parties</option>}
            {parties.map((p) => <option key={p.id} value={p.id}>{p.partyName} — {p.siteName}</option>)}
          </Select>
        </Field>
        <Field label="Due Date"><Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
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
        partyId: row.partyId, dueDate: row.dueDate, proposedAmount: row.proposedAmount, remarksRequester: row.remarksRequester,
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
          Proposed {fmtMoney(row.proposedAmount)}, due {fmtDate(row.dueDate)}
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
