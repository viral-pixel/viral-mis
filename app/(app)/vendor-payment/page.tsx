"use client";

import { useEffect, useMemo, useState } from "react";
import { IndianRupee, AlertTriangle, ListChecks } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, ConfirmDelete, Tag, Pager } from "@/app/components/ui";
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
const cellInput: React.CSSProperties = { padding: "5px 6px", fontSize: 12.5, minWidth: 90 };

export default function VendorPaymentPage() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"Open" | "Closed" | "All">("Open");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
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

  useEffect(() => { load(); setPage(1); }, [qs]);
  useEffect(() => {
    loadSuggestions();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/vendor-payment/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
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

  const pageRows = (rows ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      <datalist id="vp-vendor-names">{suggestions.vendorNames.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="vp-vendor-types">{suggestions.vendorTypes.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="vp-bank-names">{suggestions.bankNames.map((v) => <option key={v} value={v} />)}</datalist>

      {rows === null ? <Empty text="Loading…" /> : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th><Th>Vendor</Th><Th>Type</Th><Th>Bank</Th><Th>Contact</Th>
                <Th>Outstanding</Th><Th>Amount</Th><Th>Pay Type</Th><Th>Urgency</Th><Th>Remarks (Finance)</Th>
                <Th>Approved</Th><Th>Date Paid</Th><Th>Remarks (Admin)</Th><Th>Status</Th><Th />
              </tr>
            </thead>
            <tbody>
              <AddRow isAdmin={isAdmin} onSave={(d) => saveDraft(d)} />
              {pageRows.map((r) => (
                <EntryRow key={r.id} row={r} isAdmin={isAdmin} onSave={(d) => saveDraft(d, r.id)} onDelete={() => del(r.id)} />
              ))}
            </tbody>
          </Table>
          {rows.length === 0 && <Empty text="No payment requests for this filter yet — add one above." />}
          {rows.length > PAGE_SIZE && <Pager page={page} setPage={setPage} total={rows.length} pageSize={PAGE_SIZE} />}
        </>
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
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    setSaving(true);
    const ok = await onSave(d);
    setSaving(false);
    if (ok) setD({ ...BLANK_DRAFT, paymentDate: d.paymentDate }); // keep the date — batches of entries usually share one day
  };
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };

  return (
    <tr style={{ background: C.tealSoft }} onKeyDown={onKeyDown}>
      <Td><Input style={cellInput} type="date" value={d.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} /></Td>
      <Td>
        <Input style={cellInput} list="vp-vendor-names" placeholder="Vendor name" value={d.vendorName}
          onChange={(e) => set({ vendorName: e.target.value })}
          onBlur={() => { if (!d.bankName) set({ bankName: d.vendorName }); }} />
      </Td>
      <Td><Input style={cellInput} list="vp-vendor-types" placeholder="Type" value={d.vendorType} onChange={(e) => set({ vendorType: e.target.value })} /></Td>
      <Td><Input style={cellInput} list="vp-bank-names" placeholder="Bank name" value={d.bankName} onChange={(e) => set({ bankName: e.target.value })} /></Td>
      <Td><Input style={cellInput} placeholder="Phone" value={d.contactDetails} onChange={(e) => set({ contactDetails: e.target.value })} /></Td>
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
      <Td><Input style={cellInput} placeholder="Remarks" value={d.remarksFinance} onChange={(e) => set({ remarksFinance: e.target.value })} /></Td>
      {isAdmin ? (
        <>
          <Td><Input style={cellInput} type="number" step="any" value={d.approvedAmount} onChange={(e) => set({ approvedAmount: e.target.value })} /></Td>
          <Td><Input style={cellInput} type="date" value={d.datePaid} onChange={(e) => set({ datePaid: e.target.value })} /></Td>
          <Td><Input style={cellInput} placeholder="Remarks" value={d.remarksAdmin} onChange={(e) => set({ remarksAdmin: e.target.value })} /></Td>
          <Td>
            <Select style={cellInput} value={d.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="Open">Open</option><option value="Closed">Closed</option>
            </Select>
          </Td>
        </>
      ) : (
        <><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td></>
      )}
      <Td><Btn onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add"}</Btn></Td>
    </tr>
  );
}

function EntryRow({
  row, isAdmin, onSave, onDelete,
}: {
  row: PaymentRow; isAdmin: boolean; onSave: (d: Draft) => Promise<boolean>; onDelete: () => void;
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

  if (!editing) {
    return (
      <tr>
        <Td>{fmtDate(row.paymentDate)}</Td>
        <Td>{row.vendorName}</Td>
        <Td>{row.vendorType || "—"}</Td>
        <Td>{row.bankName || "—"}</Td>
        <Td>{row.contactDetails || "—"}</Td>
        <Td>{fmtMoney(row.outstandingAmount)}</Td>
        <Td>{fmtMoney(row.amount)}</Td>
        <Td>{row.paymentType}</Td>
        <Td><UrgencyTag value={row.urgency} /></Td>
        <Td>{row.remarksFinance || "—"}</Td>
        <Td>{fmtMoney(row.approvedAmount)}</Td>
        <Td>{fmtDate(row.datePaid)}</Td>
        <Td>{row.remarksAdmin || "—"}</Td>
        <Td><StatusTag value={row.status} /></Td>
        <Td>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={startEdit} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
            {isAdmin && <ConfirmDelete onConfirm={onDelete} />}
          </div>
        </Td>
      </tr>
    );
  }

  return (
    <tr style={{ background: C.amberSoft }} onKeyDown={onKeyDown}>
      <Td><Input style={cellInput} type="date" value={d.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} /></Td>
      <Td><Input style={cellInput} list="vp-vendor-names" value={d.vendorName} onChange={(e) => set({ vendorName: e.target.value })} /></Td>
      <Td><Input style={cellInput} list="vp-vendor-types" value={d.vendorType} onChange={(e) => set({ vendorType: e.target.value })} /></Td>
      <Td><Input style={cellInput} list="vp-bank-names" value={d.bankName} onChange={(e) => set({ bankName: e.target.value })} /></Td>
      <Td><Input style={cellInput} value={d.contactDetails} onChange={(e) => set({ contactDetails: e.target.value })} /></Td>
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
      <Td><Input style={cellInput} value={d.remarksFinance} onChange={(e) => set({ remarksFinance: e.target.value })} /></Td>
      {isAdmin ? (
        <>
          <Td><Input style={cellInput} type="number" step="any" value={d.approvedAmount} onChange={(e) => set({ approvedAmount: e.target.value })} /></Td>
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
      <Td>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={submit} disabled={saving} style={{ padding: "5px 10px" }}>{saving ? "…" : "Save"}</Btn>
          <Btn variant="ghost" onClick={() => setEditing(false)} style={{ padding: "5px 10px" }}>Cancel</Btn>
        </div>
      </Td>
    </tr>
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
