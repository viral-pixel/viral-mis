"use client";

import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Leaf, PieChart as PieChartIcon, UtensilsCrossed, Scale } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { SectionHead, StatCard, Table, Th, Td, Empty, Input, Btn, Select, Field } from "@/app/components/ui";
import { C, FONT_BODY, CHART_COLORS } from "@/app/lib/constants";

interface MonthlyRow {
  monthKey: string; monthLabel: string;
  jakirAmount: number; rajuAmount: number; pureVegAmount: number;
  potatoAmount: number; onionAmount: number; flakesAmount: number; fruitCashAmount: number;
  grandTotal: number;
  potatoPct: number | null; onionPct: number | null; flakesPct: number | null; nonVegPct: number | null;
  pureVegQty: number | null; potatoQty: number | null; onionQty: number | null;
  countLD: number | null;
  perPlatePureVeg: number | null; perPlatePotato: number | null; perPlateOnion: number | null; perPlatePotatoOnion: number | null;
}

interface PotatoOnionRow {
  monthKey: string; monthLabel: string;
  potatoQty: number; potatoAmount: number; potatoAvgRate: number | null;
  onionQty: number | null; onionAmount: number; onionAvgRate: number | null;
  totalPOQty: number; totalPOAmount: number; grandTotal: number;
  potatoPctOfVeg: number | null; onionPctOfVeg: number | null; totalPctOfVeg: number | null;
  monthlyDays: number; totalVegQty: number | null;
  avgPDQtyPureVeg: number | null; avgPDQtyPotato: number | null; avgPDQtyOnion: number | null;
  countLD: number | null;
  perPlatePureVeg: number | null; perPlatePotato: number | null; perPlateOnion: number | null; perPlateTotalVeg: number | null;
}

interface ItemWiseRow {
  srNo: number; itemName: string;
  jakirRate: number | null; rajuRate: number | null;
  jakirQty: number; rajuQty: number; totalQty: number;
  jakirAmount: number; rajuAmount: number; totalAmount: number;
}
interface ItemWiseAnalysis {
  monthKey: string; monthLabel: string; items: ItemWiseRow[];
  totalJakirQty: number; totalJakirAmount: number; totalRajuQty: number; totalRajuAmount: number;
  totalVegQty: number; totalVegAmount: number; fruitCashAmount: number; grandTotalWithFruit: number;
  monthlyDays: number; avgPerDayQty: number | null; avgPerDayAmount: number | null;
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtPct(n: number | null) {
  return n == null ? "—" : `${n}%`;
}
function fmtGrams(n: number | null) {
  return n == null ? "—" : `${Math.round(n)}g`;
}
function fmtQty(n: number | null) {
  return n == null ? "—" : `${Math.round(n).toLocaleString("en-IN")} kg`;
}
function fmtRate(n: number | null) {
  return n == null ? "—" : `₹${n}`;
}

const TABS = [
  ["summary", "Monthly Summary"],
  ["items", "Item-wise Analysis"],
  ["potatoOnion", "Potato & Onion Summary"],
] as const;

export default function VegetableAnalysisAdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("summary");

  return (
    <div>
      <SectionHead
        title="Vegetable Cost Analysis"
        sub="Private view, admin only — replicates all three of your report sheets, derived from Ketan's vegetable purchase data"
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(([key, label]) => (
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

      {tab === "summary" && <MonthlySummaryTab />}
      {tab === "items" && <ItemWiseTab />}
      {tab === "potatoOnion" && <PotatoOnionTab />}
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

// ---------------------------------------------------------------------
// Tab 1: "Vegetable Report" replica
// ---------------------------------------------------------------------
function MonthlySummaryTab() {
  const [rows, setRows] = useState<MonthlyRow[] | null>(null);
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
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard icon={IndianRupee} label={`Grand Total${latest ? " — " + latest.monthLabel : ""}`} value={latest ? fmtMoney(latest.grandTotal) : "—"} tint={C.teal} />
        <StatCard icon={Leaf} label="Pure Veg Spend (Jakir + Raju)" value={latest ? fmtMoney(latest.pureVegAmount) : "—"} tint={C.green} />
        <StatCard
          icon={Scale} label="Total Qty Ordered (Veg+Potato+Onion)"
          value={latest && latest.pureVegQty != null && latest.potatoQty != null && latest.onionQty != null ? fmtQty(latest.pureVegQty + latest.potatoQty + latest.onionQty) : "—"}
          tint={C.amber}
        />
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
                  <Th>Month</Th><Th>Pure Veg ₹</Th><Th>Veg Qty</Th><Th>Potato ₹</Th><Th>Potato Qty</Th><Th>Onion ₹</Th><Th>Onion Qty</Th>
                  <Th>Flakes</Th><Th>Fruit&amp;Cash</Th><Th>Grand Total</Th><Th>Non-Veg %</Th><Th>Count L/D</Th><Th>Per Plate (Veg)</Th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => (
                  <tr key={r.monthKey}>
                    <Td>{r.monthLabel}</Td>
                    <Td>{fmtMoney(r.pureVegAmount)}</Td>
                    <Td>{fmtQty(r.pureVegQty)}</Td>
                    <Td>{fmtMoney(r.potatoAmount)}</Td>
                    <Td>{fmtQty(r.potatoQty)}</Td>
                    <Td>{fmtMoney(r.onionAmount)}</Td>
                    <Td>{fmtQty(r.onionQty)}</Td>
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

// ---------------------------------------------------------------------
// Tab 2: "Veg Analysis" replica — item-wise, one month at a time
// ---------------------------------------------------------------------
function ItemWiseTab() {
  const [months, setMonths] = useState<{ monthKey: string; monthLabel: string }[]>([]);
  const [month, setMonth] = useState("");
  const [data, setData] = useState<ItemWiseAnalysis | null>(null);
  const [onlyPurchased, setOnlyPurchased] = useState(true);

  useEffect(() => {
    fetch("/api/admin/vegetable-analysis/summary").then((r) => r.json()).then((rows: MonthlyRow[]) => {
      const withData = rows.filter((r) => r.grandTotal > 0).map((r) => ({ monthKey: r.monthKey, monthLabel: r.monthLabel }));
      setMonths(withData);
      if (withData.length > 0) setMonth(withData[withData.length - 1].monthKey);
    });
  }, []);

  useEffect(() => {
    if (!month) return;
    setData(null);
    fetch(`/api/admin/vegetable-analysis/item-wise?month=${month}`).then((r) => r.json()).then(setData);
  }, [month]);

  const rows = useMemo(() => {
    if (!data) return [];
    return onlyPurchased ? data.items.filter((i) => i.totalQty > 0) : data.items;
  }, [data, onlyPurchased]);

  return (
    <ChartPanel
      title="Item-wise Vendor Comparison"
      sub="Rate, quantity and amount by item, split Jakir vs Raju — pick a month"
      action={
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <Field label="Month">
            <Select value={month} onChange={(e) => setMonth(e.target.value)} style={{ minWidth: 160 }}>
              {months.map((m) => <option key={m.monthKey} value={m.monthKey}>{m.monthLabel}</option>)}
            </Select>
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.sub, paddingBottom: 8 }}>
            <input type="checkbox" checked={onlyPurchased} onChange={(e) => setOnlyPurchased(e.target.checked)} />
            Only items purchased this month
          </label>
        </div>
      }
    >
      {!month ? <Empty text="No months with data yet." /> : !data ? <Empty text="Loading…" /> : (
        <>
          <div style={{ overflowX: "auto", maxHeight: "60vh", overflowY: "auto" }}>
            <Table>
              <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
                <tr>
                  <Th>#</Th><Th>Item</Th><Th>Jakir Rate</Th><Th>Raju Rate</Th><Th>Jakir Qty</Th><Th>Raju Qty</Th><Th>Total Qty</Th>
                  <Th>Jakir ₹</Th><Th>Raju ₹</Th><Th>Total ₹</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 20 }}><Empty text={data.totalVegQty === 0 ? "No item-level purchase data recorded for this month." : "No items match this filter."} /></td></tr>
                ) : rows.map((i) => (
                  <tr key={i.srNo}>
                    <Td>{i.srNo}</Td>
                    <Td>{i.itemName}</Td>
                    <Td>{fmtRate(i.jakirRate)}</Td>
                    <Td>{fmtRate(i.rajuRate)}</Td>
                    <Td>{i.jakirQty ? Math.round(i.jakirQty) : "—"}</Td>
                    <Td>{i.rajuQty ? Math.round(i.rajuQty) : "—"}</Td>
                    <Td>{i.totalQty ? Math.round(i.totalQty) : "—"}</Td>
                    <Td>{i.jakirAmount ? fmtMoney(i.jakirAmount) : "—"}</Td>
                    <Td>{i.rajuAmount ? fmtMoney(i.rajuAmount) : "—"}</Td>
                    <Td><strong style={{ color: C.ink }}>{i.totalAmount ? fmtMoney(i.totalAmount) : "—"}</strong></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
            <div>Jakir Total: <strong style={{ color: C.ink }}>{fmtQty(data.totalJakirQty)} / {fmtMoney(data.totalJakirAmount)}</strong></div>
            <div>Raju Total: <strong style={{ color: C.ink }}>{fmtQty(data.totalRajuQty)} / {fmtMoney(data.totalRajuAmount)}</strong></div>
            <div>Total Veg: <strong style={{ color: C.ink }}>{fmtQty(data.totalVegQty)} / {fmtMoney(data.totalVegAmount)}</strong></div>
            <div>Fruit &amp; Cash: <strong style={{ color: C.ink }}>{fmtMoney(data.fruitCashAmount)}</strong></div>
            <div>Total Veg + Fruit: <strong style={{ color: C.teal }}>{fmtMoney(data.grandTotalWithFruit)}</strong></div>
            <div>Avg/Day ({data.monthlyDays}d): <strong style={{ color: C.ink }}>{fmtQty(data.avgPerDayQty)} / {data.avgPerDayAmount != null ? fmtMoney(data.avgPerDayAmount) : "—"}</strong></div>
          </div>
        </>
      )}
    </ChartPanel>
  );
}

// ---------------------------------------------------------------------
// Tab 3: "Pot-Oni-Veg Summ" replica
// ---------------------------------------------------------------------
function PotatoOnionTab() {
  const [rows, setRows] = useState<PotatoOnionRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/vegetable-analysis/potato-onion-summary").then((r) => r.json()).then(setRows);
  }, []);

  const displayRows = useMemo(() => (rows ? [...rows].filter((r) => r.grandTotal > 0).reverse() : null), [rows]);

  return (
    <ChartPanel title="Potato &amp; Onion Summary" sub="Potato here is potato-only (Baby Potato excluded) — matches your original Pot-Oni-Veg Summ sheet, kept separate from the combined figure in Monthly Summary">
      {displayRows === null ? <Empty text="Loading…" /> : displayRows.length === 0 ? <Empty text="No data yet." /> : (
        <div style={{ overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <Th>Month</Th><Th>Potato Qty</Th><Th>Potato ₹</Th><Th>Potato Avg Rate</Th>
                <Th>Onion Qty</Th><Th>Onion ₹</Th><Th>Onion Avg Rate</Th>
                <Th>P+O Qty</Th><Th>P+O ₹</Th><Th>Total Veg Exp</Th>
                <Th>Potato % Veg</Th><Th>Onion % Veg</Th><Th>Total %</Th>
                <Th>Days</Th><Th>Avg/Day Veg</Th><Th>Avg/Day Potato</Th><Th>Avg/Day Onion</Th>
                <Th>Count L/D</Th><Th>Per Plate Veg</Th><Th>Per Plate Potato</Th><Th>Per Plate Onion</Th><Th>Per Plate Total</Th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) => (
                <tr key={r.monthKey}>
                  <Td>{r.monthLabel}</Td>
                  <Td>{fmtQty(r.potatoQty)}</Td>
                  <Td>{fmtMoney(r.potatoAmount)}</Td>
                  <Td>{fmtRate(r.potatoAvgRate)}</Td>
                  <Td>{fmtQty(r.onionQty)}</Td>
                  <Td>{fmtMoney(r.onionAmount)}</Td>
                  <Td>{fmtRate(r.onionAvgRate)}</Td>
                  <Td>{fmtQty(r.totalPOQty)}</Td>
                  <Td>{fmtMoney(r.totalPOAmount)}</Td>
                  <Td><strong style={{ color: C.ink }}>{fmtMoney(r.grandTotal)}</strong></Td>
                  <Td>{fmtPct(r.potatoPctOfVeg)}</Td>
                  <Td>{fmtPct(r.onionPctOfVeg)}</Td>
                  <Td>{fmtPct(r.totalPctOfVeg)}</Td>
                  <Td>{r.monthlyDays}</Td>
                  <Td>{fmtQty(r.avgPDQtyPureVeg)}</Td>
                  <Td>{fmtQty(r.avgPDQtyPotato)}</Td>
                  <Td>{fmtQty(r.avgPDQtyOnion)}</Td>
                  <Td>{r.countLD != null ? r.countLD.toLocaleString("en-IN") : "—"}</Td>
                  <Td>{fmtGrams(r.perPlatePureVeg)}</Td>
                  <Td>{fmtGrams(r.perPlatePotato)}</Td>
                  <Td>{fmtGrams(r.perPlateOnion)}</Td>
                  <Td>{fmtGrams(r.perPlateTotalVeg)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </ChartPanel>
  );
}
