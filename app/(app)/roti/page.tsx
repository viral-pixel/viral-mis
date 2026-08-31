"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SectionHead, Btn, Table, Th, Td, Empty, Field, Input, Textarea, Modal, ConfirmDelete } from "@/app/components/ui";
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
        <SummaryTab mealTypes={mealTypes} />
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

function SummaryTab({ mealTypes }: { mealTypes: RotiMasterRef[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{
    mealTypes: RotiMasterRef[];
    summary: ReturnType<typeof computeRotiSummary>;
    trend: { date: string; total: number }[];
    dayCount: number;
  } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    fetch(`/api/roti/summary?${p.toString()}`).then((r) => r.json()).then(setData);
  }, [from, to]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end", marginBottom: 18 }}>
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      {!data ? (
        <Empty text="Loading…" />
      ) : data.dayCount === 0 ? (
        <Empty text="No entries for this filter yet." />
      ) : (
        <>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Daily Grand Total Trend ({data.dayCount} day{data.dayCount === 1 ? "" : "s"})</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10.5 }} tickFormatter={(v) => dateLabel(v)} />
                <YAxis tick={{ fontSize: 10.5 }} />
                <Tooltip labelFormatter={(v) => dateLabel(String(v))} formatter={(v) => fmtNum(Number(v))} />
                <Line type="monotone" dataKey="total" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>By Site — where demand is coming from</div>
              <Table>
                <thead>
                  <tr>
                    <Th>Site</Th>
                    {data.mealTypes.map((mt) => <Th key={mt.id}>{mt.name}</Th>)}
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.perSite
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((s) => (
                      <tr key={s.siteId}>
                        <Td>{s.siteName}</Td>
                        {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(s.byMeal[mt.id] ?? 0)}</Td>)}
                        <Td style={{ fontWeight: 700 }}>{fmtNum(s.total)}</Td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>By Category — what&apos;s being served</div>
              <Table>
                <thead>
                  <tr>
                    <Th>Category</Th>
                    {data.mealTypes.map((mt) => <Th key={mt.id}>{mt.name}</Th>)}
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.perCategory
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((c) => (
                      <tr key={c.categoryId}>
                        <Td>{c.categoryName}</Td>
                        {data.mealTypes.map((mt) => <Td key={mt.id}>{fmtNum(c.byMeal[mt.id] ?? 0)}</Td>)}
                        <Td style={{ fontWeight: 700 }}>{fmtNum(c.total)}</Td>
                      </tr>
                    ))}
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
