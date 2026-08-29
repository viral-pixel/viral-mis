"use client";

import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Leaf, PieChart as PieChartIcon, UtensilsCrossed } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { SectionHead, StatCard, Table, Th, Td, Empty, Input, Btn } from "@/app/components/ui";
import { C, FONT_BODY, CHART_COLORS } from "@/app/lib/constants";

interface Row {
  monthKey: string; monthLabel: string;
  jakirAmount: number; rajuAmount: number; pureVegAmount: number;
  potatoAmount: number; onionAmount: number; flakesAmount: number; fruitCashAmount: number;
  grandTotal: number;
  potatoPct: number | null; onionPct: number | null; flakesPct: number | null; nonVegPct: number | null;
  countLD: number | null;
  perPlatePureVeg: number | null; perPlatePotato: number | null; perPlateOnion: number | null; perPlatePotatoOnion: number | null;
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtPct(n: number | null) {
  return n == null ? "—" : `${n}%`;
}
function fmtGrams(n: number | null) {
  return n == null ? "—" : `${n}g`;
}

export default function VegetableAnalysisAdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/admin/vegetable-analysis/summary").then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const displayRows = useMemo(() => (rows ? [...rows].filter((r) => r.grandTotal > 0).reverse() : null), [rows]);
  const latest = displayRows && displayRows.length > 0 ? displayRows[0] : null;
  const chartRows = useMemo(() => (rows ? [...rows].filter((r) => r.grandTotal > 0) : []), [rows]);

  const saveCount = async (monthKey: string) => {
    const n = Number(editValue);
    if (isNaN(n) || n < 0) { alert("Enter a valid number"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/vegetable-analysis/meal-count", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthKey, countLD: n }),
    });
    setSaving(false);
    if (res.ok) { setEditingMonth(null); load(); }
    else alert("Could not save");
  };

  return (
    <div>
      <SectionHead
        title="Vegetable Cost Analysis"
        sub="Private view, admin only — derived from Ketan's vegetable purchase data, plus the monthly meal count you enter here"
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard icon={IndianRupee} label={`Grand Total${latest ? " — " + latest.monthLabel : ""}`} value={latest ? fmtMoney(latest.grandTotal) : "—"} tint={C.teal} />
        <StatCard icon={Leaf} label="Pure Veg Spend (Jakir + Raju)" value={latest ? fmtMoney(latest.pureVegAmount) : "—"} tint={C.green} />
        <StatCard icon={PieChartIcon} label="Non-Veg % (Potato + Onion + Flakes)" value={latest ? fmtPct(latest.nonVegPct) : "—"} tint={C.amber} />
        <StatCard icon={UtensilsCrossed} label="Pure Veg per Plate" value={latest ? fmtGrams(latest.perPlatePureVeg) : "—"} tint={C.teal} />
      </div>

      <ChartPanel title="Portion Size Trend — Grams per Plate" sub="Rising lines mean bigger portions (or fewer meals for the same spend) — the earliest signal of cost creep" style={{ marginBottom: 22 }}>
        {chartRows.length === 0 ? <Empty text="No months with a Count L/D entered yet." /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartRows} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `${v}g`} />
              <Tooltip formatter={(v) => `${v}g`} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Legend wrapperStyle={{ fontFamily: FONT_BODY, fontSize: 12 }} />
              <Line type="monotone" dataKey="perPlatePureVeg" name="Pure Veg" stroke={C.green} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="perPlatePotato" name="Potato" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="perPlateOnion" name="Onion" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Spend Mix by Month" sub="Where the vegetable rupee actually goes" style={{ marginBottom: 22 }}>
        {chartRows.length === 0 ? <Empty text="No data yet." /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartRows} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Legend wrapperStyle={{ fontFamily: FONT_BODY, fontSize: 12 }} />
              <Bar dataKey="pureVegAmount" name="Pure Veg" stackId="a" fill={C.green} />
              <Bar dataKey="potatoAmount" name="Potato" stackId="a" fill={CHART_COLORS[1]} />
              <Bar dataKey="onionAmount" name="Onion" stackId="a" fill={CHART_COLORS[2]} />
              <Bar dataKey="flakesAmount" name="Flakes" stackId="a" fill={CHART_COLORS[3]} />
              <Bar dataKey="fruitCashAmount" name="Fruit & Cash" stackId="a" fill={C.sub} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Monthly Summary" sub="Count L/D is the only figure you enter — everything else comes from Ketan's data automatically">
        {displayRows === null ? <Empty text="Loading…" /> : displayRows.length === 0 ? <Empty text="No months with data yet." /> : (
          <div style={{ overflowX: "auto" }}>
            <Table>
              <thead>
                <tr>
                  <Th>Month</Th><Th>Pure Veg</Th><Th>Potato</Th><Th>Onion</Th><Th>Flakes</Th><Th>Fruit&amp;Cash</Th>
                  <Th>Grand Total</Th><Th>Non-Veg %</Th><Th>Count L/D</Th><Th>Per Plate (Pure Veg)</Th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => (
                  <tr key={r.monthKey}>
                    <Td>{r.monthLabel}</Td>
                    <Td>{fmtMoney(r.pureVegAmount)}</Td>
                    <Td>{fmtMoney(r.potatoAmount)}</Td>
                    <Td>{fmtMoney(r.onionAmount)}</Td>
                    <Td>{fmtMoney(r.flakesAmount)}</Td>
                    <Td>{fmtMoney(r.fruitCashAmount)}</Td>
                    <Td><strong style={{ color: C.ink }}>{fmtMoney(r.grandTotal)}</strong></Td>
                    <Td>{fmtPct(r.nonVegPct)}</Td>
                    <Td>
                      {editingMonth === r.monthKey ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <Input
                            type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            style={{ width: 90, padding: "4px 7px" }} autoFocus
                          />
                          <Btn onClick={() => saveCount(r.monthKey)} disabled={saving} style={{ padding: "4px 10px", fontSize: 12 }}>Save</Btn>
                          <button onClick={() => setEditingMonth(null)} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingMonth(r.monthKey); setEditValue(r.countLD != null ? String(r.countLD) : ""); }}
                          style={{ background: "none", border: "none", color: r.countLD != null ? C.ink : C.teal, cursor: "pointer", fontSize: 13, fontWeight: r.countLD == null ? 600 : 400, textDecoration: r.countLD == null ? "underline" : "none" }}
                        >
                          {r.countLD != null ? r.countLD.toLocaleString("en-IN") : "+ Enter"}
                        </button>
                      )}
                    </Td>
                    <Td>{fmtGrams(r.perPlatePureVeg)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </ChartPanel>
    </div>
  );
}

function ChartPanel({ title, sub, children, style }: { title: string; sub?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, ...style }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
