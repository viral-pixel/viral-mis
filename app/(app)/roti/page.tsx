"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Settings2, Utensils, Layers, CalendarDays, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle, CalendarX, PackageX } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { SectionHead, Btn, Table, Th, Td, Empty, Field, Input, Textarea, Modal, ConfirmDelete, StatCard } from "@/app/components/ui";
import { C, FONT_BODY, CHART_COLORS } from "@/app/lib/constants";
import { computeRotiSummary, RotiMasterRef } from "@/app/lib/rotiSummary";

interface RotiLineItemRow {
  id: number;
  siteId: number;
  mealTypeId: number;
  categoryId: number;
  quantity: number;
}
interface RotiDayRow {
  id: number;
  date: string;
  remarks: string;
  lines: RotiLineItemRow[];
}

function fmtNum(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function RotiPage() {
  const [tab, setTab] = useState<"entries" | "summary">("entries");
  const [sites, setSites] = useState<RotiMasterRef[]>([]);
  const [mealTypes, setMealTypes] = useState<RotiMasterRef[]>([]);
  const [categories, setCategories] = useState<RotiMasterRef[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showManageMasters, setShowManageMasters] = useState(false);

  const loadMasters = () => {
    fetch("/api/roti/sites").then((r) => r.json()).then(setSites);
    fetch("/api/roti/meal-types").then((r) => r.json()).then(setMealTypes);
    fetch("/api/roti/categories").then((r) => r.json()).then(setCategories);
  };

  useEffect(() => {
    loadMasters();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  return (
    <div>
      <SectionHead
        title="Kiran Reports"
        sub="Roti / Meal Count — daily site-wise, meal-wise count of Roti / Paratha / Poori / Thepla served"
        action={
          <Btn variant="ghost" onClick={() => setShowManageMasters(true)}>
            <Settings2 size={15} /> Manage Sites, Meals &amp; Categories
          </Btn>
        }
      />

      {showManageMasters && (
        <ManageMastersModal
          sites={sites}
          mealTypes={mealTypes}
          categories={categories}
          onClose={() => setShowManageMasters(false)}
          onChanged={loadMasters}
        />
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {(["entries", "summary"] as const).map((t) => (
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
            {t === "entries" ? "Daily Entries" : "Demand Summary"}
          </button>
        ))}
      </div>

      {tab === "entries" ? (
        <EntriesTab sites={sites} mealTypes={mealTypes} categories={categories} isAdmin={isAdmin} />
      ) : (
        <SummaryTab />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Entries

function EntriesTab({
  sites, mealTypes, categories, isAdmin,
}: {
  sites: RotiMasterRef[]; mealTypes: RotiMasterRef[]; categories: RotiMasterRef[]; isAdmin: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState<RotiDayRow[] | null>(null);
  const [editing, setEditing] = useState<RotiDayRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [from, to]);

  const load = () => fetch(`/api/roti/entries?${qs}`).then((r) => r.json()).then(setDays);
  useEffect(() => { load(); }, [qs]);

  const del = async (date: string) => {
    const res = await fetch(`/api/roti/entries/${date}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Could not delete");
  };

  const ready = sites.length > 0 && mealTypes.length > 0 && categories.length > 0;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end", marginBottom: 14 }}>
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <div style={{ flex: 1 }} />
        <Btn onClick={() => { setEditing(null); setShowForm(true); }} disabled={!ready}>
          <Plus size={15} /> Add Day Entry
        </Btn>
      </div>

      {!ready && days !== null && (
        <div style={{ color: C.sub, fontSize: 13, marginBottom: 14 }}>
          Set up at least one Site, Meal Type, and Category first (Manage Sites, Meals &amp; Categories, above) before adding entries.
        </div>
      )}

      {days === null ? (
        <Empty text="Loading…" />
      ) : days.length === 0 ? (
        <Empty text="No entries for this filter yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              {mealTypes.map((mt) => <Th key={mt.id}>{mt.name} Total</Th>)}
              <Th>Grand Total</Th>
              <Th>Remarks</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const s = computeRotiSummary(sites, mealTypes, categories, d.lines);
              return (
                <tr key={d.id}>
                  <Td>{dateLabel(d.date)}</Td>
                  {mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(s.byMeal[mt.id] ?? 0)}</Td>)}
                  <Td style={{ fontWeight: 700 }}>{fmtNum(s.grandTotal)}</Td>
                  <Td>{d.remarks || <span style={{ color: C.faint }}>—</span>}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button onClick={() => { setEditing(d); setShowForm(true); }} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                      {isAdmin && <ConfirmDelete onConfirm={() => del(d.date.slice(0, 10))} />}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {showForm && (
        <DayEntryForm
          sites={sites}
          mealTypes={mealTypes}
          categories={categories}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function lineKey(siteId: number, mealTypeId: number, categoryId: number) {
  return `${siteId}-${mealTypeId}-${categoryId}`;
}

function DayEntryForm({
  sites, mealTypes, categories, initial, onClose, onSaved,
}: {
  sites: RotiMasterRef[]; mealTypes: RotiMasterRef[]; categories: RotiMasterRef[];
  initial: RotiDayRow | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : todayStr());
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const l of initial?.lines ?? []) map[lineKey(l.siteId, l.mealTypeId, l.categoryId)] = String(l.quantity);
    return map;
  });
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Re-editing a date that already has an entry — jump straight to it, same
  // "pick date, existing data loads" pattern as the vegetable bill grid.
  useEffect(() => {
    if (initial) return; // already have the lines for the day being edited
    if (!date) return;
    setLoadingExisting(true);
    fetch(`/api/roti/entries/${date}`)
      .then((r) => r.json())
      .then((d: RotiDayRow | null) => {
        const map: Record<string, string> = {};
        if (d) {
          setRemarks(d.remarks ?? "");
          for (const l of d.lines) map[lineKey(l.siteId, l.mealTypeId, l.categoryId)] = String(l.quantity);
        } else {
          setRemarks("");
        }
        setValues(map);
        setLoadingExisting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const setValue = (siteId: number, mealTypeId: number, categoryId: number, v: string) => {
    setValues((prev) => ({ ...prev, [lineKey(siteId, mealTypeId, categoryId)]: v }));
  };

  const parsedLines = useMemo(() => {
    const out: { siteId: number; mealTypeId: number; categoryId: number; quantity: number }[] = [];
    for (const site of sites) {
      for (const mt of mealTypes) {
        for (const cat of categories) {
          const raw = values[lineKey(site.id, mt.id, cat.id)];
          const n = raw ? Number(raw) : 0;
          if (raw && !isNaN(n) && n !== 0) out.push({ siteId: site.id, mealTypeId: mt.id, categoryId: cat.id, quantity: n });
        }
      }
    }
    return out;
  }, [values, sites, mealTypes, categories]);

  const summary = useMemo(() => computeRotiSummary(sites, mealTypes, categories, parsedLines), [parsedLines, sites, mealTypes, categories]);

  const submit = async () => {
    if (!date) { setError("Date is required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/roti/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, remarks, lines: parsedLines }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); }
  };

  return (
    <Modal title={initial ? "Edit Day Entry" : "Add Day Entry"} onClose={onClose} width={960}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14 }}>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!initial} required />
          </Field>
        </div>

        {loadingExisting ? (
          <Empty text="Loading…" />
        ) : (
          <div style={{ maxHeight: "44vh", overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
                <tr>
                  <th rowSpan={2} style={{ textAlign: "left", padding: "8px 10px", color: C.sub, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, position: "sticky", left: 0, background: "#fff" }}>SITE</th>
                  {mealTypes.map((mt) => (
                    <th key={mt.id} colSpan={categories.length} style={{ textAlign: "center", padding: "6px 8px", color: C.ink, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}` }}>
                      {mt.name.toUpperCase()}
                    </th>
                  ))}
                  <th rowSpan={2} style={{ textAlign: "right", padding: "8px 10px", color: C.sub, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}` }}>SITE TOTAL</th>
                </tr>
                <tr>
                  {mealTypes.map((mt) => categories.map((cat) => (
                    <th key={`${mt.id}-${cat.id}`} style={{ textAlign: "center", padding: "5px 6px", color: C.sub, fontWeight: 600, fontSize: 10.5, borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}`, minWidth: 62 }}>
                      {cat.name}
                    </th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => {
                  const siteTotal = summary.perSite.find((s) => s.siteId === site.id)?.total ?? 0;
                  return (
                    <tr key={site.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "5px 10px", fontWeight: 600, borderRight: `1px solid ${C.border}`, position: "sticky", left: 0, background: "#fff" }}>{site.name}</td>
                      {mealTypes.map((mt) => categories.map((cat) => (
                        <td key={`${mt.id}-${cat.id}`} style={{ padding: "3px 4px", borderLeft: `1px solid ${C.border}` }}>
                          <input
                            type="number" step="any" min={0}
                            value={values[lineKey(site.id, mt.id, cat.id)] ?? ""}
                            onChange={(e) => setValue(site.id, mt.id, cat.id, e.target.value)}
                            style={{ width: "100%", padding: "4px 5px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 12.5, fontFamily: FONT_BODY, textAlign: "right" }}
                          />
                        </td>
                      )))}
                      <td style={{ padding: "5px 10px", textAlign: "right", color: C.sub, fontWeight: 600, borderLeft: `1px solid ${C.border}` }}>{fmtNum(siteTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, display: "flex", flexWrap: "wrap", gap: 18, fontSize: 12.5 }}>
          {mealTypes.map((mt) => (
            <div key={mt.id}><span style={{ color: C.sub }}>Grand Total {mt.name}: </span><strong>{fmtNum(summary.byMeal[mt.id] ?? 0)}</strong></div>
          ))}
          <div><span style={{ color: C.sub }}>Grand Total Overall: </span><strong>{fmtNum(summary.grandTotal)}</strong></div>
          {categories.map((cat) => (
            <div key={cat.id}><span style={{ color: C.sub }}>Total {cat.name}: </span><strong>{fmtNum(summary.perCategory.find((c) => c.categoryId === cat.id)?.total ?? 0)}</strong></div>
          ))}
        </div>

        <Field label="Remarks">
          <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note for this day" />
        </Field>

        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving || loadingExisting}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Summary

interface DailyBreakdownRow {
  date: string;
  remarks: string;
  byCategory: Record<number, number>;
  byMeal: Record<number, number>;
  total: number;
}
interface SummaryData {
  sites: RotiMasterRef[];
  mealTypes: RotiMasterRef[];
  categories: RotiMasterRef[];
  perSite: ReturnType<typeof computeRotiSummary>["perSite"];
  perCategory: ReturnType<typeof computeRotiSummary>["perCategory"];
  dailyBreakdown: DailyBreakdownRow[];
  dayCount: number;
}

// Deviation flag on the day-by-day table, compared against the SAME
// weekday's trailing average — not a plain calendar-trailing average.
// Verified against the real imported data that a naive trailing-7-calendar-
// day average flags nearly every Sunday as "under-ordered" for months on
// end, because Sundays are structurally ~50% lower than the rest of the
// week here — a real, repeating pattern, not a problem. Comparing each day
// only to its last several same-weekday occurrences (e.g. Sunday vs. the
// last 6 Sundays) is what actually isolates genuine one-off deviations from
// the normal weekly rhythm. Requires >=3 prior same-weekday data points
// before flagging, and the day itself must clear a small floor so a
// near-zero day doesn't get flagged as a "huge spike" off another
// near-zero baseline.
const TREND_FLAG_PCT = 30;
const TREND_FLAG_MIN = 50;
const WEEKDAY_LOOKBACK = 6;

function sameWeekdayAverage(byDate: Map<string, DailyBreakdownRow>, dateStr: string): number | null {
  const d = new Date(dateStr + "T00:00:00Z");
  const vals: number[] = [];
  for (let w = 1; w <= WEEKDAY_LOOKBACK; w++) {
    const prior = new Date(d);
    prior.setUTCDate(prior.getUTCDate() - 7 * w);
    const row = byDate.get(prior.toISOString().slice(0, 10));
    if (row) vals.push(row.total);
  }
  if (vals.length < 3) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function trendFlag(byDate: Map<string, DailyBreakdownRow>, day: DailyBreakdownRow): "high" | "low" | null {
  const avg = sameWeekdayAverage(byDate, day.date);
  if (avg == null || avg <= 0 || day.total < TREND_FLAG_MIN) return null;
  const deviationPct = ((day.total - avg) / avg) * 100;
  if (deviationPct >= TREND_FLAG_PCT) return "high";
  if (deviationPct <= -TREND_FLAG_PCT) return "low";
  return null;
}

// Compact horizontal pill selector — used for both the Site and Category
// "tabs" so either can be optionally narrowed without a dropdown.
function PillSelect<T extends { id: number; name: string }>({
  label, options, value, onChange, allLabel,
}: {
  label: string; options: T[]; value: number | ""; onChange: (v: number | "") => void; allLabel: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[{ id: "" as const, name: allLabel }, ...options].map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id === "" ? "all" : opt.id}
              onClick={() => onChange(opt.id)}
              style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: active ? C.teal : "#fff", color: active ? "#fff" : C.ink,
                border: `1px solid ${active ? C.teal : C.border}`,
              }}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrendBadge({ flag }: { flag: "high" | "low" | null }) {
  if (!flag) return null;
  const up = flag === "high";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 6, padding: "1px 6px", borderRadius: 5,
      fontSize: 10.5, fontWeight: 700, background: up ? "#FBF0DD" : "#E8F0FE", color: up ? "#B9770E" : "#3B5FC4",
    }}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {up ? "High" : "Low"}
    </span>
  );
}

const ALERT_TYPE_META: Record<"missed" | "spike" | "dip" | "gap", { label: string; bg: string; color: string; icon: typeof AlertTriangle }> = {
  missed: { label: "Missed order?", bg: "#FDECEC", color: C.red, icon: PackageX },
  spike: { label: "Spike / wastage?", bg: "#FBF0DD", color: "#B9770E", icon: TrendingUp },
  dip: { label: "Under-ordered?", bg: "#E8F0FE", color: "#3B5FC4", icon: TrendingDown },
  gap: { label: "No entry", bg: C.bg, color: C.sub, icon: CalendarX },
};

function AlertTypeBadge({ type }: { type: "missed" | "spike" | "dip" | "gap" }) {
  const meta = ALERT_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5,
      fontSize: 10.5, fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: "nowrap",
    }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function SummaryTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [siteId, setSiteId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (siteId) p.set("siteId", String(siteId));
    if (categoryId) p.set("categoryId", String(categoryId));
    fetch(`/api/roti/summary?${p.toString()}`).then((r) => r.json()).then(setData);
  }, [from, to, siteId, categoryId]);

  const selectedSiteName = siteId ? data?.sites.find((s) => s.id === siteId)?.name : null;
  const selectedCategoryName = categoryId ? data?.categories.find((c) => c.id === categoryId)?.name : null;
  const selectionLabel = [selectedCategoryName, selectedSiteName].filter(Boolean).join(" @ ") || "All Sites, All Categories";

  // Derived from dailyBreakdown, which the API already scoped to BOTH the
  // selected site and category — this is the one number set that reflects
  // the current selection exactly.
  const filtered = useMemo(() => {
    const byMeal: Record<number, number> = {};
    let grandTotal = 0;
    for (const d of data?.dailyBreakdown ?? []) {
      for (const [k, v] of Object.entries(d.byMeal)) byMeal[Number(k)] = (byMeal[Number(k)] ?? 0) + v;
      grandTotal += d.total;
    }
    return { byMeal, grandTotal };
  }, [data]);

  const insights = useMemo(() => {
    const days = data?.dailyBreakdown ?? [];
    const nonZero = days.filter((d) => d.total > 0);
    if (nonZero.length === 0) return null;
    const peak = nonZero.reduce((a, b) => (b.total > a.total ? b : a));
    const lowest = nonZero.reduce((a, b) => (b.total < a.total ? b : a));
    const latest = days[days.length - 1];
    const previous = days.length >= 2 ? days[days.length - 2] : null;
    const changePct = previous && previous.total > 0 ? ((latest.total - previous.total) / previous.total) * 100 : null;
    return { peak, lowest, latest, previous, changePct };
  }, [data]);

  const byDate = useMemo(() => new Map((data?.dailyBreakdown ?? []).map((d) => [d.date, d])), [data]);

  // "Problems worth a look" — a sudden drop to zero against a real
  // same-weekday average (possible missed order), a spike well above that
  // weekday's trend (possible over-ordering / wastage), a dip well below it
  // (possible under-ordering), or a date with no entry logged at all (a
  // straight calendar gap, only checkable when both From and To are set).
  const alerts = useMemo(() => {
    if (!data) return [];
    const days = data.dailyBreakdown;
    const list: { date: string; type: "missed" | "spike" | "dip" | "gap"; detail: string }[] = [];

    days.forEach((d) => {
      const avg = sameWeekdayAverage(byDate, d.date);
      if (avg == null || avg < TREND_FLAG_MIN) return;
      const weekday = new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      if (d.total === 0) {
        list.push({ date: d.date, type: "missed", detail: `0 recorded vs a ${fmtNum(avg)} average for ${weekday}s` });
      } else {
        const pct = ((d.total - avg) / avg) * 100;
        if (pct >= TREND_FLAG_PCT) list.push({ date: d.date, type: "spike", detail: `${fmtNum(d.total)}, +${pct.toFixed(0)}% vs ${weekday} average of ${fmtNum(avg)}` });
        else if (pct <= -TREND_FLAG_PCT) list.push({ date: d.date, type: "dip", detail: `${fmtNum(d.total)}, ${pct.toFixed(0)}% vs ${weekday} average of ${fmtNum(avg)}` });
      }
    });

    if (from && to) {
      const present = new Set(days.map((d) => d.date));
      const cursor = new Date(from + "T00:00:00Z");
      const end = new Date(to + "T00:00:00Z");
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        if (!present.has(key)) list.push({ date: key, type: "gap", detail: "No entry logged for this date" });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [data, from, to, byDate]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        {data && (
          <>
            <PillSelect label="Site" options={data.sites} value={siteId} onChange={setSiteId} allLabel="All Sites" />
            <PillSelect label="Category" options={data.categories} value={categoryId} onChange={setCategoryId} allLabel="All Categories" />
          </>
        )}
      </div>

      {!data ? (
        <Empty text="Loading…" />
      ) : data.dayCount === 0 ? (
        <Empty text="No entries for this filter yet." />
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
            {data.mealTypes.map((mt, i) => (
              <StatCard
                key={mt.id}
                icon={Utensils}
                tint={CHART_COLORS[i % CHART_COLORS.length]}
                label={`Total ${mt.name}`}
                value={fmtNum(filtered.byMeal[mt.id] ?? 0)}
              />
            ))}
            <StatCard icon={Layers} tint={C.teal} label="Grand Total" value={fmtNum(filtered.grandTotal)} />
            <StatCard icon={CalendarDays} tint={C.amber} label={`Daily Average (${data.dayCount} day${data.dayCount === 1 ? "" : "s"})`} value={fmtNum(filtered.grandTotal / data.dayCount)} />
          </div>
          <div style={{ color: C.sub, fontSize: 12, marginBottom: 20 }}>Showing: <strong style={{ color: C.ink }}>{selectionLabel}</strong></div>

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: alerts.length ? 10 : 0 }}>
              <AlertTriangle size={15} color={alerts.length ? C.amber : C.green} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                {alerts.length === 0 ? "No unusual patterns detected" : `${alerts.length} thing${alerts.length === 1 ? "" : "s"} worth a look — ${selectionLabel}`}
              </div>
            </div>
            {alerts.length === 0 ? (
              <div style={{ fontSize: 12, color: C.sub }}>
                No sudden drops to zero, spikes, dips (&gt;{TREND_FLAG_PCT}% off trailing average), or missing days found in this selection.
              </div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 6, background: C.bg, fontSize: 12.5 }}>
                    <AlertTypeBadge type={a.type} />
                    <span style={{ fontWeight: 600, minWidth: 84 }}>{dateLabel(a.date)}</span>
                    <span style={{ color: C.sub }}>{a.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {insights && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
              <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
                  <TrendingUp size={13} color={C.green} /> Peak Day
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, color: C.ink }}>{fmtNum(insights.peak.total)}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{dateLabel(insights.peak.date)}</div>
              </div>
              <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
                  <TrendingDown size={13} color={C.red} /> Lowest Day
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, color: C.ink }}>{fmtNum(insights.lowest.total)}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{dateLabel(insights.lowest.date)}</div>
              </div>
              {insights.previous && (
                <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
                    {insights.changePct != null && insights.changePct < 0 ? <ArrowDownRight size={13} color={C.red} /> : <ArrowUpRight size={13} color={C.green} />} Latest vs Previous Day
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, color: C.ink }}>
                    {fmtNum(insights.latest.total)}
                    {insights.changePct != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 8, color: insights.changePct < 0 ? C.red : C.green }}>
                        {insights.changePct >= 0 ? "+" : ""}{insights.changePct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.sub }}>{dateLabel(insights.latest.date)} vs {dateLabel(insights.previous.date)} ({fmtNum(insights.previous.total)})</div>
                </div>
              )}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>
              Daily Trend — {selectionLabel} ({data.dayCount} day{data.dayCount === 1 ? "" : "s"})
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10.5 }} tickFormatter={(v) => dateLabel(v)} />
                <YAxis tick={{ fontSize: 10.5 }} />
                <Tooltip labelFormatter={(v) => dateLabel(String(v))} formatter={(v) => fmtNum(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                {data.mealTypes.map((mt, i) => (
                  <Line key={mt.id} type="monotone" dataKey={`byMeal.${mt.id}`} name={mt.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
                <Line type="monotone" dataKey="total" name="Total" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
              Day-by-Day — {selectionLabel} (most recent first)
            </div>
            <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10 }}>
              <TrendBadge flag="high" /> / <TrendBadge flag="low" /> marks a day &gt;{TREND_FLAG_PCT}% above/below the average for that same weekday (e.g. Sunday vs. recent Sundays) — so a normal weekly pattern isn&apos;t flagged as a problem.
            </div>
            <div style={{ maxHeight: "46vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    {data.categories.map((c) => <Th key={c.id}>{c.name}</Th>)}
                    {data.mealTypes.map((mt) => <Th key={mt.id}>{mt.name} Total</Th>)}
                    <Th>Day Total</Th>
                    <Th>Remarks</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyBreakdown
                    .map((d) => ({ d, flag: trendFlag(byDate, d) }))
                    .slice()
                    .reverse()
                    .map(({ d, flag }) => (
                      <tr key={d.date}>
                        <Td>{dateLabel(d.date)}</Td>
                        {data.categories.map((c) => <Td key={c.id}>{fmtNum(d.byCategory[c.id] ?? 0)}</Td>)}
                        {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(d.byMeal[mt.id] ?? 0)}</Td>)}
                        <Td style={{ fontWeight: 700 }}>{fmtNum(d.total)}<TrendBadge flag={flag} /></Td>
                        <Td>{d.remarks || <span style={{ color: C.faint }}>—</span>}</Td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>By Site — where demand is coming from{selectedCategoryName ? ` (${selectedCategoryName})` : ""}</div>
              <Table>
                <thead>
                  <tr>
                    <Th>Site</Th>
                    {data.mealTypes.map((mt) => <Th key={mt.id}>{mt.name}</Th>)}
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.perSite
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((s) => (
                      <tr key={s.siteId} style={{ background: s.siteId === siteId ? C.tealSoft : undefined }}>
                        <Td>{s.siteName}</Td>
                        {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(s.byMeal[mt.id] ?? 0)}</Td>)}
                        <Td style={{ fontWeight: 700 }}>{fmtNum(s.total)}</Td>
                      </tr>
                    ))}
                  <tr style={{ borderTop: `2px solid ${C.ink}`, background: C.bg, fontWeight: 700 }}>
                    <Td>Total</Td>
                    {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(data.perSite.reduce((s, x) => s + (x.byMeal[mt.id] ?? 0), 0))}</Td>)}
                    <Td>{fmtNum(data.perSite.reduce((s, x) => s + x.total, 0))}</Td>
                  </tr>
                </tbody>
              </Table>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>By Category — what&apos;s being served{selectedSiteName ? ` at ${selectedSiteName}` : ""}</div>
              <Table>
                <thead>
                  <tr>
                    <Th>Category</Th>
                    {data.mealTypes.map((mt) => <Th key={mt.id}>{mt.name}</Th>)}
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.perCategory
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((c) => (
                      <tr key={c.categoryId} style={{ background: c.categoryId === categoryId ? C.tealSoft : undefined }}>
                        <Td>{c.categoryName}</Td>
                        {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(c.byMeal[mt.id] ?? 0)}</Td>)}
                        <Td style={{ fontWeight: 700 }}>{fmtNum(c.total)}</Td>
                      </tr>
                    ))}
                  <tr style={{ borderTop: `2px solid ${C.ink}`, background: C.bg, fontWeight: 700 }}>
                    <Td>Total</Td>
                    {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(data.perCategory.reduce((s, x) => s + (x.byMeal[mt.id] ?? 0), 0))}</Td>)}
                    <Td>{fmtNum(data.perCategory.reduce((s, x) => s + x.total, 0))}</Td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Masters

function ManageMastersModal({
  sites, mealTypes, categories, onClose, onChanged,
}: {
  sites: RotiMasterRef[]; mealTypes: RotiMasterRef[]; categories: RotiMasterRef[];
  onClose: () => void; onChanged: () => void;
}) {
  return (
    <Modal title="Manage Sites, Meals & Categories" onClose={onClose} width={760}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <MasterList title="Sites" apiBase="/api/roti/sites" items={sites} placeholder="e.g. New Site" onChanged={onChanged} />
        <MasterList title="Meal Types" apiBase="/api/roti/meal-types" items={mealTypes} placeholder="e.g. Breakfast" onChanged={onChanged} />
        <MasterList title="Categories" apiBase="/api/roti/categories" items={categories} placeholder="e.g. Dhokla" onChanged={onChanged} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
}

function MasterList({
  title, apiBase, items, placeholder, onChanged,
}: {
  title: string; apiBase: string; items: RotiMasterRef[]; placeholder: string; onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true); setError("");
    const res = await fetch(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setSaving(false);
    if (res.ok) { setName(""); onChanged(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not add"); }
  };

  const del = async (id: number) => {
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    if (res.ok) onChanged();
    else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not delete"); }
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>{title}</div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
        {items.length === 0 ? (
          <div style={{ padding: 10, color: C.faint, fontSize: 12.5 }}>None yet.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
              <span>{it.name}</span>
              <ConfirmDelete onConfirm={() => del(it.id)} />
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} style={{ fontSize: 12.5 }} />
        <Btn variant="ghost" onClick={add} disabled={saving}>Add</Btn>
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
