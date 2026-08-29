"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, Modal, ConfirmDelete } from "@/app/components/ui";
import { C, FONT_BODY, CHART_COLORS } from "@/app/lib/constants";
import { IndianRupee, Boxes, CalendarClock } from "lucide-react";

interface PurchaseItem {
  id: number;
  name: string;
  unit: string;
  hasAmount: boolean;
  hasQuantity: boolean;
  sortOrder: number;
}
interface MonthSummary {
  month: string;
  totalAmount: number;
  itemCount: number;
}
interface MonthEntry {
  id: number;
  itemCategoryId: number;
  amount: number | null;
  quantity: number | null;
}
interface PurchaseStats {
  totalMonths: number;
  totalSpend: number;
  latestMonthLabel: string | null;
  latestMonthSpend: number | null;
  monthlyCostTrend: { monthLabel: string; monthKey: string; totalAmount: number }[];
  costByItem: { itemId: number; name: string; unit: string; totalAmount: number; totalQuantity: number }[];
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function monthLabelFromKey(key: string) {
  const d = new Date(key);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function PurchasePage() {
  const [tab, setTab] = useState<"analysis" | "entries">("analysis");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/purchase/items").then((r) => r.json()).then(setItems);
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
          </div>
        }
      />

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
              textTransform: "capitalize",
            }}
          >
            {t === "analysis" ? "Costing Analysis" : "Monthly Entries"}
          </button>
        ))}
      </div>

      {tab === "analysis" ? <AnalysisTab items={items} /> : <EntriesTab items={items} isAdmin={isAdmin} />}
    </div>
  );
}

function AnalysisTab({ items }: { items: PurchaseItem[] }) {
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [trend, setTrend] = useState<{ monthLabel: string; amount: number | null; quantity: number | null; costPerUnit: number | null }[] | null>(null);

  useEffect(() => {
    fetch("/api/purchase/stats").then((r) => r.json()).then(setStats);
  }, []);

  useEffect(() => {
    if (!selectedItemId) return;
    setTrend(null);
    fetch(`/api/purchase/stats?itemId=${selectedItemId}`).then((r) => r.json()).then((d) => setTrend(d.trend ?? []));
  }, [selectedItemId]);

  useEffect(() => {
    if (stats && stats.costByItem.length > 0 && selectedItemId === null) {
      setSelectedItemId(stats.costByItem[0].itemId);
    }
  }, [stats, selectedItemId]);

  if (!stats) return <Empty text="Loading…" />;
  if (stats.totalMonths === 0) {
    return <Empty text="No purchase data yet — add your first month under Monthly Entries." />;
  }

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard icon={CalendarClock} label="Months Tracked" value={stats.totalMonths} tint={C.teal} />
        <StatCard icon={IndianRupee} label="Total Spend (all time)" value={fmtMoney(stats.totalSpend)} tint={C.amber} />
        <StatCard icon={Boxes} label={`Latest Month${stats.latestMonthLabel ? " — " + stats.latestMonthLabel : ""}`} value={stats.latestMonthSpend != null ? fmtMoney(stats.latestMonthSpend) : "—"} tint={C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 22, alignItems: "stretch" }}>
        <ChartPanel title="Monthly Spend Trend" sub="Total cost across all commodities, by month">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.monthlyCostTrend} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Bar dataKey="totalAmount" fill={C.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Cost by Commodity" sub="Total spend across all months, top items">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.costByItem.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontFamily: FONT_BODY, fontSize: 11.5, fill: C.ink }} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Bar dataKey="totalAmount" fill={C.amber} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <ChartPanel
        title="Item Trend — Cost, Volume & Cost-per-Unit"
        sub="Pick a commodity to see how its price and purchase volume have moved over time"
        action={
          <Select value={selectedItemId ?? ""} onChange={(e) => setSelectedItemId(Number(e.target.value))} style={{ width: 220 }}>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        }
      >
        {!trend ? (
          <Empty text="Loading…" />
        ) : trend.length === 0 ? (
          <Empty text="No data yet for this item." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis yAxisId="left" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <Tooltip contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              {selectedItem?.hasAmount && <Line yAxisId="left" type="monotone" dataKey="amount" name="Amount (₹)" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />}
              {selectedItem?.hasQuantity && <Line yAxisId="right" type="monotone" dataKey="quantity" name={`Quantity (${selectedItem?.unit})`} stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />}
              {selectedItem?.hasAmount && selectedItem?.hasQuantity && (
                <Line yAxisId="right" type="monotone" dataKey="costPerUnit" name={`Cost per ${selectedItem?.unit}`} stroke={CHART_COLORS[3]} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>
    </div>
  );
}

function ChartPanel({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
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

function EntriesTab({ items, isAdmin }: { items: PurchaseItem[]; isAdmin: boolean }) {
  const [months, setMonths] = useState<MonthSummary[] | null>(null);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => fetch("/api/purchase/months").then((r) => r.json()).then(setMonths);
  useEffect(() => { load(); }, []);

  const del = async (month: string) => {
    const res = await fetch(`/api/purchase/months/${month}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Could not delete");
  };

  return (
    <div>
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
                alert(`Imported ${d.monthsImported} month(s).`);
                load();
              } else {
                alert(d.error || "Import failed");
              }
              e.target.value = "";
            }}
          />
        </label>
        <Btn onClick={() => { setEditingMonth(null); setShowForm(true); }}>
          <Plus size={15} /> Add Month
        </Btn>
      </div>

      {months === null ? (
        <Empty text="Loading…" />
      ) : months.length === 0 ? (
        <Empty text="No months entered yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th>Items Entered</Th>
              <Th>Total Amount</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <Td>{monthLabelFromKey(m.month)}</Td>
                <Td>{m.itemCount} / {items.length}</Td>
                <Td>{fmtMoney(m.totalAmount)}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                      onClick={() => { setEditingMonth(m.month); setShowForm(true); }}
                      style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(m.month)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && (
        <MonthForm
          items={items}
          initialMonth={editingMonth}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function MonthForm({
  items,
  initialMonth,
  onClose,
  onSaved,
}: {
  items: PurchaseItem[];
  initialMonth: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [month, setMonth] = useState(initialMonth ? initialMonth.slice(0, 7) : "");
  const [values, setValues] = useState<Record<number, { amount: string; quantity: string }>>({});
  const [loading, setLoading] = useState(!!initialMonth);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialMonth) return;
    fetch(`/api/purchase/months/${initialMonth}`)
      .then((r) => r.json())
      .then((entries: MonthEntry[]) => {
        const v: Record<number, { amount: string; quantity: string }> = {};
        for (const e of entries) {
          v[e.itemCategoryId] = { amount: e.amount != null ? String(e.amount) : "", quantity: e.quantity != null ? String(e.quantity) : "" };
        }
        setValues(v);
        setLoading(false);
      });
  }, [initialMonth]);

  const setField = (itemId: number, field: "amount" | "quantity", val: string) => {
    setValues((v) => ({ ...v, [itemId]: { ...(v[itemId] ?? { amount: "", quantity: "" }), [field]: val } }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month) { setError("Month is required"); return; }
    setSaving(true);
    setError("");
    const entries = items.map((item) => {
      const v = values[item.id] ?? { amount: "", quantity: "" };
      return {
        itemCategoryId: item.id,
        amount: v.amount === "" ? null : Number(v.amount),
        quantity: v.quantity === "" ? null : Number(v.quantity),
      };
    });
    const res = await fetch("/api/purchase/months", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: `${month}-01`, entries }),
    });
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
      setSaving(false);
    }
  };

  return (
    <Modal title={initialMonth ? `Edit ${monthLabelFromKey(initialMonth)}` : "Add Month"} onClose={onClose} width={860}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 16, maxWidth: 220 }}>
          <Field label="Month">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={!!initialMonth} required />
          </Field>
        </div>

        {loading ? (
          <Empty text="Loading…" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", maxHeight: "50vh", overflowY: "auto", paddingRight: 6 }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: "0 0 150px", fontSize: 13, fontWeight: 600, color: C.ink }}>{item.name}</div>
                {item.hasAmount && (
                  <input
                    type="number"
                    step="any"
                    placeholder="Amount ₹"
                    value={values[item.id]?.amount ?? ""}
                    onChange={(e) => setField(item.id, "amount", e.target.value)}
                    style={{ width: 100, fontSize: 12.5, padding: "5px 7px", borderRadius: 5, border: `1px solid ${C.border}` }}
                  />
                )}
                {item.hasQuantity && (
                  <input
                    type="number"
                    step="any"
                    placeholder={`Qty ${item.unit}`}
                    value={values[item.id]?.quantity ?? ""}
                    onChange={(e) => setField(item.id, "quantity", e.target.value)}
                    style={{ width: 100, fontSize: 12.5, padding: "5px 7px", borderRadius: 5, border: `1px solid ${C.border}` }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving || loading}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
