"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Upload, Settings2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete } from "@/app/components/ui";
import { C, FONT_BODY, CHART_COLORS } from "@/app/lib/constants";
import { IndianRupee, Boxes, CalendarClock } from "lucide-react";

interface PurchaseGroup {
  id: number;
  name: string;
  unit: string;
  hasAmount: boolean;
  hasQuantity: boolean;
  sortOrder: number;
  subItems: string[];
}
interface PurchaseEntryRow {
  id: number;
  month: string;
  groupId: number;
  group: PurchaseGroup;
  amount: number | null;
  quantity: number | null;
  isDeduction: boolean;
  subItem: string;
  remarks: string;
}
interface PurchaseStats {
  totalMonths: number;
  totalSpend: number;
  latestMonthLabel: string | null;
  latestMonthSpend: number | null;
  monthlyCostTrend: { monthLabel: string; monthKey: string; totalAmount: number }[];
  costByGroup: { groupId: number; name: string; unit: string; totalAmount: number; totalQuantity: number }[];
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function monthLabelFromKey(key: string) {
  const d = new Date(key);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

export default function PurchasePage() {
  const [tab, setTab] = useState<"analysis" | "entries">("analysis");
  const [groups, setGroups] = useState<PurchaseGroup[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);

  const loadGroups = () => fetch("/api/purchase/groups").then((r) => r.json()).then(setGroups);

  useEffect(() => {
    loadGroups();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  return (
    <div>
      <SectionHead
        title="Ketan Reports"
        sub="Purchase & Consumption Costing — cost and volume tracking across kitchen commodities"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <a href="/api/purchase/export" style={{ textDecoration: "none" }}>
              <Btn variant="ghost"><Download size={15} /> Export Excel</Btn>
            </a>
            {isAdmin && (
              <Btn variant="ghost" onClick={() => setShowManageGroups(true)}>
                <Settings2 size={15} /> Manage Commodities
              </Btn>
            )}
          </div>
        }
      />

      {showManageGroups && (
        <ManageGroupsModal groups={groups} onClose={() => setShowManageGroups(false)} onChanged={loadGroups} />
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {(["analysis", "entries"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === t ? C.teal : "#fff",
              color: tab === t ? "#fff" : C.ink,
              border: `1px solid ${tab === t ? C.teal : C.border}`,
            }}
          >
            {t === "analysis" ? "Costing Analysis" : "Entries"}
          </button>
        ))}
      </div>

      {tab === "analysis" ? <AnalysisTab groups={groups} /> : <EntriesTab groups={groups} isAdmin={isAdmin} />}
    </div>
  );
}

function FilterBar({
  from, to, groupId, groups, onChange, showGroupFilter = true, groupLabel = "Commodity",
}: {
  from: string; to: string; groupId?: string;
  groups: PurchaseGroup[];
  onChange: (v: { from?: string; to?: string; groupId?: string }) => void;
  showGroupFilter?: boolean;
  groupLabel?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
      <Field label="From month">
        <Input type="month" value={from} onChange={(e) => onChange({ from: e.target.value })} />
      </Field>
      <Field label="To month">
        <Input type="month" value={to} onChange={(e) => onChange({ to: e.target.value })} />
      </Field>
      {showGroupFilter && (
        <Field label={groupLabel}>
          <Select value={groupId ?? ""} onChange={(e) => onChange({ groupId: e.target.value })} style={{ minWidth: 200 }}>
            <option value="">All commodities</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </Field>
      )}
      {(from || to || groupId) && (
        <Btn variant="ghost" onClick={() => onChange({ from: "", to: "", groupId: "" })}>Clear filters</Btn>
      )}
    </div>
  );
}

function AnalysisTab({ groups }: { groups: PurchaseGroup[] }) {
  // Deliberately no commodity filter here: the stat cards, monthly trend,
  // and "Cost by Commodity" breakdown all need to see EVERY commodity to
  // mean anything — filtering them down to one commodity collapses the
  // breakdown chart to a single bar, which is meaningless (caught via user
  // feedback + screenshot, 2026-08-29). Only month range narrows this
  // section. Per-commodity drill-down lives in its own selector below,
  // completely independent of these.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [trendGroupId, setTrendGroupId] = useState<number | null>(null);
  const [trendSubItem, setTrendSubItem] = useState<string>(""); // "" = whole group combined
  const [trend, setTrend] = useState<{ monthLabel: string; amount: number | null; quantity: number | null; costPerUnit: number | null }[] | null>(null);
  const [subItemBreakdown, setSubItemBreakdown] = useState<{ subItem: string; totalAmount: number; totalQuantity: number }[] | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [from, to]);

  useEffect(() => {
    setStats(null);
    fetch(`/api/purchase/stats?${qs}`).then((r) => r.json()).then(setStats);
  }, [qs]);

  useEffect(() => {
    if (groups.length > 0 && trendGroupId === null) {
      setTrendGroupId(groups[0].id);
    }
  }, [groups, trendGroupId]);

  // Selecting a different commodity resets any sub-item drill-down —
  // "Roti" from the previous commodity has no meaning for the new one.
  useEffect(() => { setTrendSubItem(""); }, [trendGroupId]);

  useEffect(() => {
    if (!trendGroupId) return;
    setTrend(null);
    const p = new URLSearchParams(qs);
    p.set("trendGroupId", String(trendGroupId));
    if (trendSubItem) p.set("subItem", trendSubItem);
    fetch(`/api/purchase/stats?${p.toString()}`).then((r) => r.json()).then((d) => setTrend(d.trend ?? []));
  }, [trendGroupId, trendSubItem, qs]);

  const selectedGroup = groups.find((g) => g.id === trendGroupId);

  useEffect(() => {
    if (!trendGroupId || !selectedGroup?.subItems.length) { setSubItemBreakdown(null); return; }
    const p = new URLSearchParams(qs);
    p.set("subItemBreakdownGroupId", String(trendGroupId));
    fetch(`/api/purchase/stats?${p.toString()}`).then((r) => r.json()).then((d) => setSubItemBreakdown(d.breakdown ?? []));
  }, [trendGroupId, selectedGroup?.subItems.length, qs]);

  return (
    <div>
      <FilterBar from={from} to={to} groups={groups} showGroupFilter={false} onChange={(v) => {
        if (v.from !== undefined) setFrom(v.from);
        if (v.to !== undefined) setTo(v.to);
      }} />

      {!stats ? (
        <Empty text="Loading…" />
      ) : stats.totalMonths === 0 ? (
        <Empty text="No purchase data for this filter — add entries under the Entries tab." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
            <StatCard icon={CalendarClock} label="Months in Range" value={stats.totalMonths} tint={C.teal} />
            <StatCard icon={IndianRupee} label="Total Spend" value={fmtMoney(stats.totalSpend)} tint={C.amber} />
            <StatCard icon={Boxes} label={`Latest Month${stats.latestMonthLabel ? " — " + stats.latestMonthLabel : ""}`} value={stats.latestMonthSpend != null ? fmtMoney(stats.latestMonthSpend) : "—"} tint={C.green} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 22, alignItems: "stretch" }}>
            <ChartPanel title="Monthly Spend Trend (Amount)" sub="Total ₹ across commodities, by month — net of any deductions">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.monthlyCostTrend} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                  <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="totalAmount" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Cost by Commodity" sub="Total spend in range, top commodities">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.costByGroup.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.ink }} />
                  <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="totalAmount" fill={C.amber} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div style={{ marginTop: 28, marginBottom: 10 }}>
            <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: C.ink }}>Amount vs. Quantity — by commodity</h3>
            <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 10 }}>
              Pick one commodity to see its cost and volume trends side by side, independent of the filters above.
              {selectedGroup && selectedGroup.subItems.length > 0 && " This commodity combines several items — narrow to just one below, or leave it on “All combined” for the overall figure."}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Field label="Commodity">
                <Select value={trendGroupId ?? ""} onChange={(e) => setTrendGroupId(Number(e.target.value))} style={{ maxWidth: 320 }}>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </Field>
              {selectedGroup && selectedGroup.subItems.length > 0 && (
                <Field label="Specific item">
                  <Select value={trendSubItem} onChange={(e) => setTrendSubItem(e.target.value)} style={{ maxWidth: 240 }}>
                    <option value="">All combined</option>
                    {selectedGroup.subItems.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
              )}
            </div>
          </div>

          {selectedGroup && selectedGroup.subItems.length > 0 && subItemBreakdown && subItemBreakdown.length > 0 && (
            <ChartPanel title={`Breakdown within ${selectedGroup.name}`} sub="Total spend per item, in range — click “Specific item” above to see its own trend" style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={Math.max(120, subItemBreakdown.length * 34)}>
                <BarChart data={subItemBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="subItem" width={130} tick={{ fontFamily: FONT_BODY, fontSize: 11.5, fill: C.ink }} />
                  <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="totalAmount" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ChartPanel title="Amount Analysis" sub={`${trendSubItem || selectedGroup?.name || ""} — ₹ spent per month`}>
              {!selectedGroup?.hasAmount ? (
                <Empty text={`${selectedGroup?.name ?? "This commodity"} doesn't track Amount — only Quantity is recorded for it.`} />
              ) : !trend ? (
                <Empty text="Loading…" />
              ) : trend.length === 0 ? (
                <Empty text="No data yet for this commodity." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                    <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                    <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
                    <Line type="monotone" dataKey="amount" name="Amount (₹)" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Quantity Analysis" sub={`${trendSubItem || selectedGroup?.name || ""} — volume purchased per month${selectedGroup?.unit ? ` (${selectedGroup.unit})` : ""}`}>
              {!selectedGroup?.hasQuantity ? (
                <Empty text={`${selectedGroup?.name ?? "This commodity"} doesn't track Quantity — only Amount is recorded for it.`} />
              ) : !trend ? (
                <Empty text="Loading…" />
              ) : trend.length === 0 ? (
                <Empty text="No data yet for this commodity." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                    <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                    <Tooltip contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
                    <Line type="monotone" dataKey="quantity" name={`Quantity (${selectedGroup?.unit || "units"})`} stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
          </div>
          {selectedGroup?.hasAmount && selectedGroup?.hasQuantity && trend && trend.some((t) => t.costPerUnit != null) && (
            <ChartPanel title="Cost per Unit" sub={`${trendSubItem || selectedGroup.name} — ₹ per ${selectedGroup.unit || "unit"}, derived from Amount ÷ Quantity`} style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                  <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
                  <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
                  <Line type="monotone" dataKey="costPerUnit" name={`₹ / ${selectedGroup.unit || "unit"}`} stroke={CHART_COLORS[3]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          )}
        </>
      )}
    </div>
  );
}

function ChartPanel({ title, sub, action, children, style }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, ...style }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EntriesTab({ groups, isAdmin }: { groups: PurchaseGroup[]; isAdmin: boolean }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupId, setGroupId] = useState("");
  const [entries, setEntries] = useState<PurchaseEntryRow[] | null>(null);
  const [editing, setEditing] = useState<PurchaseEntryRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (groupId) p.set("groupId", groupId);
    return p.toString();
  }, [from, to, groupId]);

  const load = () => fetch(`/api/purchase/entries?${qs}`).then((r) => r.json()).then(setEntries);
  useEffect(() => { load(); }, [qs]);

  const del = async (id: number) => {
    const res = await fetch(`/api/purchase/entries/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Could not delete");
  };

  return (
    <div>
      <FilterBar from={from} to={to} groupId={groupId} groups={groups} onChange={(v) => {
        if (v.from !== undefined) setFrom(v.from);
        if (v.to !== undefined) setTo(v.to);
        if (v.groupId !== undefined) setGroupId(v.groupId);
      }} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <label style={{ display: "inline-flex" }}>
          <Btn variant="ghost" onClick={() => document.getElementById("purchase-import-input")?.click()}>
            <Upload size={15} /> Import Excel
          </Btn>
          <input
            id="purchase-import-input"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/purchase/import", { method: "POST", body: formData });
              const d = await res.json().catch(() => ({}));
              if (res.ok) {
                alert(`Imported ${d.created} entr${d.created === 1 ? "y" : "ies"}.${d.errors?.length ? ` ${d.errors.length} error(s).` : ""}`);
                load();
              } else {
                alert(d.error || "Import failed");
              }
              e.target.value = "";
            }}
          />
        </label>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={15} /> Add Entry
        </Btn>
      </div>

      {entries === null ? (
        <Empty text="Loading…" />
      ) : entries.length === 0 ? (
        <Empty text="No entries for this filter yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th>Commodity</Th>
              <Th>Item</Th>
              <Th>Amount</Th>
              <Th>Quantity</Th>
              <Th>Remarks</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <Td>{monthLabelFromKey(e.month)}</Td>
                <Td>{e.group.name}</Td>
                <Td>{e.subItem || <span style={{ color: C.faint }}>—</span>}</Td>
                <Td>{e.amount != null ? (e.isDeduction ? "− " : "") + fmtMoney(e.amount) : <span style={{ color: C.faint }}>—</span>}</Td>
                <Td>{e.quantity != null ? `${e.isDeduction ? "− " : ""}${e.quantity} ${e.group.unit}` : <span style={{ color: C.faint }}>—</span>}</Td>
                <Td>{e.remarks || <span style={{ color: C.faint }}>—</span>}{e.isDeduction && <span style={{ marginLeft: 6, fontSize: 11, color: C.red, fontWeight: 600 }}>DEDUCTION</span>}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => { setEditing(e); setShowForm(true); }} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(e.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && (
        <EntryForm groups={groups} initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function EntryForm({
  groups, initial, onClose, onSaved,
}: {
  groups: PurchaseGroup[];
  initial: PurchaseEntryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [month, setMonth] = useState(initial ? initial.month.slice(0, 7) : "");
  const [groupId, setGroupId] = useState<number | "">(initial?.groupId ?? "");
  const [subItem, setSubItem] = useState(initial?.subItem ?? "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [isDeduction, setIsDeduction] = useState(initial?.isDeduction ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedGroup = groups.find((g) => g.id === groupId);
  const needsSubItem = (selectedGroup?.subItems.length ?? 0) > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !groupId) { setError("Month and Commodity are required"); return; }
    if (needsSubItem && !subItem) { setError("Pick which item this entry is for"); return; }
    setSaving(true);
    setError("");
    const url = initial ? `/api/purchase/entries/${initial.id}` : "/api/purchase/entries";
    const method = initial ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, groupId, subItem: needsSubItem ? subItem : "", amount, quantity, remarks, isDeduction }),
    });
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? "Edit Entry" : "Add Entry"} onClose={onClose} width={520}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Month">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          </Field>
          <Field label="Commodity">
            <Select value={groupId} onChange={(e) => { setGroupId(Number(e.target.value)); setSubItem(""); }} required>
              <option value="">Select…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
        </div>
        {needsSubItem && (
          <Field label="Which item is this entry for?">
            <Select value={subItem} onChange={(e) => setSubItem(e.target.value)} required>
              <option value="">Select…</option>
              {selectedGroup!.subItems.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        )}
        {selectedGroup && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {selectedGroup.hasAmount && (
              <Field label="Amount (₹)">
                <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            )}
            {selectedGroup.hasQuantity && (
              <Field label={`Quantity ${selectedGroup.unit ? `(${selectedGroup.unit})` : ""}`}>
                <Input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
            )}
          </div>
        )}
        <Field label="Remarks (vendor, brand, notes)">
          <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Vendor XYZ, bottles given to ABC Caterers…" />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.ink }}>
          <input type="checkbox" checked={isDeduction} onChange={(e) => setIsDeduction(e.target.checked)} />
          This is a deduction (subtract from the monthly total — e.g. gas bottles given to a vendor)
        </label>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function ManageGroupsModal({
  groups, onClose, onChanged,
}: {
  groups: PurchaseGroup[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [hasAmount, setHasAmount] = useState(true);
  const [hasQuantity, setHasQuantity] = useState(true);
  const [subItemsText, setSubItemsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!hasAmount && !hasQuantity) { setError("Track at least Amount or Quantity"); return; }
    setSaving(true);
    setError("");
    const subItems = subItemsText.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/purchase/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), unit: unit.trim(), hasAmount, hasQuantity, subItems }),
    });
    if (res.ok) {
      setName(""); setUnit(""); setHasAmount(true); setHasQuantity(true); setSubItemsText(""); setShowAdd(false);
      onChanged();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
    }
    setSaving(false);
  };

  return (
    <Modal title="Manage Commodities" onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ maxHeight: "40vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: C.sub, textTransform: "uppercase" }}>Name</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: C.sub, textTransform: "uppercase" }}>Unit</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: C.sub, textTransform: "uppercase" }}>Tracks</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: C.sub, textTransform: "uppercase" }}>Combines</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 10px" }}>{g.name}</td>
                  <td style={{ padding: "7px 10px", color: C.sub }}>{g.unit || "—"}</td>
                  <td style={{ padding: "7px 10px", color: C.sub }}>
                    {[g.hasAmount && "Amount", g.hasQuantity && "Quantity"].filter(Boolean).join(" + ")}
                  </td>
                  <td style={{ padding: "7px 10px", color: C.sub }}>{g.subItems.length > 0 ? g.subItems.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!showAdd ? (
          <Btn variant="ghost" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Commodity</Btn>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <Field label="Name">
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer" />
            </Field>
            <Field label="Unit (leave blank if amount-only)">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Kg, Ltrs, Pcs" />
            </Field>
            <Field label="Combines several items? List them, comma separated (optional)">
              <Input value={subItemsText} onChange={(e) => setSubItemsText(e.target.value)} placeholder="e.g. Chapati, Naan — leave blank if this is one single item" />
            </Field>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={hasAmount} onChange={(e) => setHasAmount(e.target.checked)} /> Track Amount (₹)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={hasQuantity} onChange={(e) => setHasQuantity(e.target.checked)} /> Track Quantity
              </label>
            </div>
            {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Add"}</Btn>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
