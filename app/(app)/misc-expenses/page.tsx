"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Upload, IndianRupee, CalendarClock, TrendingUp, MessageSquare } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Textarea, Modal, ConfirmDelete, Tag } from "@/app/components/ui";
import { C, FONT_HEAD } from "@/app/lib/constants";
import { BIG_EXPENSE_FACTOR } from "@/app/lib/miscExpensesMeta";

type Role = "admin" | "raiser" | "responder";
interface Query {
  id: number; question: string; raisedBy: string; raisedByName: string; raisedAt: string;
  status: string; response: string; respondedBy: string; closedAt: string | null;
}
interface Expense { id: number; month: string; amount: number; remarks: string; queries: Query[] }

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}
// Query dates are real timestamps — show the calendar day in India time
// (date only, per the user: time isn't needed).
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

const ROLE_NOTE: Record<Role, string> = {
  admin: "You can upload, edit and delete, and raise queries. Rajiv's queries come to you; yours are not visible to him.",
  raiser: "You can view everything and raise queries month-wise. You see your own queries and Sandip's replies to them.",
  responder: "You can view everything and answer every query — Admin's and Rajiv's — with Send & Close.",
};

export default function MiscExpensesPage() {
  const [data, setData] = useState<{ role: Role; rows: Expense[] } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [uploading, setUploading] = useState(false);
  const [raiseDraft, setRaiseDraft] = useState<Record<number, string>>({});
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/misc-expenses").then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const rows = data?.rows ?? [];
  const role = data?.role;
  const isAdmin = role === "admin";
  const canRaise = role === "admin" || role === "raiser";

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const avg = rows.length ? total / rows.length : 0;
    const top = rows.reduce<Expense | null>((best, r) => (!best || r.amount > best.amount ? r : best), null);
    const openQueries = rows.reduce((s, r) => s + r.queries.filter((q) => q.status === "Open").length, 0);
    return { total, avg, top, openQueries };
  }, [rows]);
  const isBig = (amount: number) => rows.length > 1 && amount >= stats.avg * BIG_EXPENSE_FACTOR;

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/misc-expenses/import", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) {
      alert(`Done — ${d.created} month(s) added, ${d.updated} updated.${d.errors?.length ? `\n\n${d.errors.length} row(s) skipped:\n${d.errors.join("\n")}` : ""}`);
      load();
    } else {
      alert(d.error || "Upload failed");
    }
  };

  const del = async (id: number) => {
    const res = await fetch(`/api/misc-expenses/${id}`, { method: "DELETE" });
    if (res.ok) { if (openId === id) setOpenId(null); load(); } else alert("Could not delete");
  };

  const raise = async (expenseId: number) => {
    const question = (raiseDraft[expenseId] ?? "").trim();
    if (!question) return;
    setBusy(true);
    const res = await fetch(`/api/misc-expenses/${expenseId}/queries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    setBusy(false);
    if (res.ok) { setRaiseDraft((p) => ({ ...p, [expenseId]: "" })); load(); }
    else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not raise the query"); }
  };

  const reply = async (queryId: number) => {
    const response = (replyDraft[queryId] ?? "").trim();
    if (!response) return;
    setBusy(true);
    const res = await fetch(`/api/misc-expenses/queries/${queryId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }) });
    setBusy(false);
    if (res.ok) { setReplyDraft((p) => ({ ...p, [queryId]: "" })); load(); }
    else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not send the response"); }
  };

  const colSpan = isAdmin ? 5 : 4;

  return (
    <div>
      <SectionHead
        title="Miscellaneous Expenses"
        sub="Additional company expenses, month by month — click a month for its breakdown and queries"
        action={isAdmin ? (
          <label style={{ display: "inline-flex" }}>
            <Btn variant="ghost" disabled={uploading} onClick={() => document.getElementById("misc-upload-input")?.click()}>
              <Upload size={15} /> {uploading ? "Uploading…" : "Upload Excel"}
            </Btn>
            <input
              id="misc-upload-input" type="file" accept=".xlsx,.xls" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }}
            />
          </label>
        ) : undefined}
      />

      {role && <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 16 }}>{ROLE_NOTE[role]}{isAdmin && " Re-uploading a month replaces its amount and remarks."}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <StatCard icon={IndianRupee} label="Total Expenses" value={fmtMoney(stats.total)} tint={C.teal} />
        <StatCard icon={CalendarClock} label="Months" value={rows.length} tint={C.sub} />
        <StatCard icon={TrendingUp} label={`Highest${stats.top ? " — " + fmtMonth(stats.top.month) : ""}`} value={stats.top ? fmtMoney(stats.top.amount) : "—"} tint={C.red} />
        <StatCard icon={MessageSquare} label="Open Queries" value={stats.openQueries} tint={C.amber} />
      </div>

      {rows.length > 1 && (
        <div style={{ color: C.sub, fontSize: 12, marginBottom: 10 }}>
          Highlighted months are {BIG_EXPENSE_FACTOR}× the average month ({fmtMoney(stats.avg)}) or more.
        </div>
      )}

      {data === null ? <Empty text="Loading…" /> : rows.length === 0 ? (
        <Empty text={isAdmin ? "No expenses yet — upload your Excel to begin." : "No expenses have been uploaded yet."} />
      ) : (
        <Table>
          <thead>
            <tr><Th /><Th>Month</Th><Th>Amount</Th><Th>Queries</Th>{isAdmin && <Th />}</tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const open = openId === r.id;
              const big = isBig(r.amount);
              const openQ = r.queries.filter((q) => q.status === "Open").length;
              const closedQ = r.queries.length - openQ;
              return (
                <Fragment key={r.id}>
                  <tr onClick={() => setOpenId(open ? null : r.id)} style={{ cursor: "pointer", background: big ? C.amberSoft : undefined }}>
                    <Td>{open ? <ChevronDown size={14} color={C.sub} /> : <ChevronRight size={14} color={C.sub} />}</Td>
                    <Td><span style={{ fontWeight: big ? 700 : 500 }}>{fmtMonth(r.month)}</span></Td>
                    <Td>
                      <span style={{ fontFamily: big ? FONT_HEAD : undefined, fontSize: big ? 18 : undefined, fontWeight: big ? 700 : 500, color: big ? C.amber : C.ink }}>
                        {fmtMoney(r.amount)}
                      </span>
                      {big && <span style={{ marginLeft: 8 }}><Tag color={C.amber} bg="#fff">BIG</Tag></span>}
                    </Td>
                    <Td>
                      {r.queries.length === 0 ? <span style={{ color: C.faint }}>—</span> : (
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          {openQ > 0 && <Tag color={C.amber} bg={C.amberSoft}>{openQ} OPEN</Tag>}
                          {closedQ > 0 && <Tag color={C.green} bg={C.greenSoft}>{closedQ} CLOSED</Tag>}
                        </span>
                      )}
                    </Td>
                    {isAdmin && (
                      <Td>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setEditing(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                          <ConfirmDelete onConfirm={() => del(r.id)} />
                        </div>
                      </Td>
                    )}
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={colSpan} style={{ padding: 0, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 16 }}>
                          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                              Breakdown — {fmtMonth(r.month)}
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.6, color: C.ink }}>{r.remarks || "No remarks recorded."}</div>
                          </div>

                          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Queries</div>
                            {r.queries.length === 0 && <div style={{ color: C.faint, fontSize: 13, marginBottom: 8 }}>No queries on this month.</div>}
                            {r.queries.map((q) => (
                              <div key={q.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, color: C.sub }}>{q.raisedByName} · {fmtDay(q.raisedAt)}</span>
                                  {q.status === "Open"
                                    ? <Tag color={C.amber} bg={C.amberSoft}>OPEN</Tag>
                                    : <Tag color={C.green} bg={C.greenSoft}>CLOSED{q.closedAt ? ` · ${fmtDay(q.closedAt)}` : ""}</Tag>}
                                </div>
                                <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{q.question}</div>
                                {q.status === "Closed" && (
                                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                                    <div style={{ fontSize: 12, color: C.sub, marginBottom: 3 }}>Response — {q.respondedBy}</div>
                                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{q.response}</div>
                                  </div>
                                )}
                                {q.status === "Open" && role === "responder" && (
                                  <div style={{ marginTop: 8 }}>
                                    <Textarea rows={3} placeholder="Your response…" value={replyDraft[q.id] ?? ""} onChange={(e) => setReplyDraft((p) => ({ ...p, [q.id]: e.target.value }))} />
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                      <Btn onClick={() => reply(q.id)} disabled={busy || !(replyDraft[q.id] ?? "").trim()}>Send &amp; Close</Btn>
                                    </div>
                                  </div>
                                )}
                                {q.status === "Open" && role !== "responder" && (
                                  <div style={{ marginTop: 6, fontSize: 12, color: C.faint }}>Waiting for Sandip's response…</div>
                                )}
                              </div>
                            ))}

                            {canRaise && (
                              <div>
                                <Textarea rows={3} placeholder={`Raise a query on ${fmtMonth(r.month)}…`} value={raiseDraft[r.id] ?? ""} onChange={(e) => setRaiseDraft((p) => ({ ...p, [r.id]: e.target.value }))} />
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                  <Btn onClick={() => raise(r.id)} disabled={busy || !(raiseDraft[r.id] ?? "").trim()}>Raise Query</Btn>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Page level, never inside the table (a fixed dialog nested in <tbody> is invalid HTML). */}
      {editing && <EditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditModal({ row, onClose, onSaved }: { row: Expense; onClose: () => void; onSaved: () => void }) {
  const [month, setMonth] = useState(row.month.slice(0, 7));
  const [amount, setAmount] = useState(String(row.amount));
  const [remarks, setRemarks] = useState(row.remarks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch(`/api/misc-expenses/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, amount, remarks }) });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title="Edit Month" onClose={onClose} width={640}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required /></Field>
          <Field label="Amount (₹)"><Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        </div>
        <Field label="Remarks (breakdown)"><Textarea rows={14} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
