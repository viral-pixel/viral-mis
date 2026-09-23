"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SectionHead, StatCard, Table, Th, Td, Empty, Field, Input, Btn } from "@/app/components/ui";
import { C, FONT_MONO } from "@/app/lib/constants";
import { WEEKLY_MIS_LINES, WEEKLY_MIS_UNITS, type WeeklyMisLine } from "@/app/lib/alkeshMeta";
import { IndianRupee, Milk as MilkIcon } from "lucide-react";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmt(n: number, unit: string) {
  const rounded = Math.round(n * 100) / 100;
  return unit === "₹" ? "₹" + Math.round(n).toLocaleString("en-IN") : rounded.toLocaleString("en-IN");
}

interface WeeklyMisReport {
  monthKey: string;
  weeks: { label: string; values: Record<WeeklyMisLine, number> }[];
  totals: Record<WeeklyMisLine, number>;
  targets: Record<string, number>;
  variance: Record<string, number>;
}
interface MrpAnalysis {
  total: number; count: number;
  byCategory: { name: string; amount: number }[];
  bySite: { name: string; amount: number }[];
  byVendor: { name: string; amount: number }[];
  trend: { monthKey: string; amount: number }[];
}
interface MilkBreakdownRow { site: string; teaQty: number; pantryQty: number; curdQty: number; buttermilkQty: number }
interface TargetRow { category: string; monthlyTarget: number }

export default function AlkeshKitchenMisPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [forbidden, setForbidden] = useState(false);
  const [report, setReport] = useState<WeeklyMisReport | null>(null);
  const [mrpAnalysis, setMrpAnalysis] = useState<MrpAnalysis | null>(null);
  const [milkBreakdown, setMilkBreakdown] = useState<MilkBreakdownRow[] | null>(null);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [showTargets, setShowTargets] = useState(false);

  const load = () => {
    fetch(`/api/alkesh/mis/weekly?month=${month}`).then((r) => { if (r.status === 403) { setForbidden(true); return null; } return r.json(); }).then((d) => d && setReport(d));
    fetch(`/api/alkesh/mis/mrp-analysis?month=${month}`).then((r) => r.json()).then(setMrpAnalysis);
    fetch(`/api/alkesh/mis/milk-breakdown?month=${month}`).then((r) => r.json()).then(setMilkBreakdown);
    fetch(`/api/alkesh/mis/targets`).then((r) => r.json()).then(setTargets);
  };
  useEffect(load, [month]);

  if (forbidden) {
    return <Empty text="Admin access required — this analysis is not shared with other logins." />;
  }

  const totalTea = milkBreakdown?.reduce((s, r) => s + r.teaQty, 0) ?? 0;
  const totalPantry = milkBreakdown?.reduce((s, r) => s + r.pantryQty, 0) ?? 0;

  return (
    <div>
      <SectionHead
        title="Kitchen Weekly MIS — Analysis"
        sub="Consolidated view of Alkesh's data (MRP, Milk, Gas, Provision), plus Roti (Kiran) and Vegetable (Ketan), auto-computed weekly. Admin only."
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
            <Btn variant="ghost" onClick={() => setShowTargets(true)}>Edit Targets</Btn>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard icon={IndianRupee} label="MRP (Month)" value={report ? fmt(report.totals.MRP, "₹") : "…"} tint={C.teal} />
        <StatCard icon={IndianRupee} label="Gas (Month)" value={report ? fmt(report.totals.Gas, "₹") : "…"} tint={C.amber} />
        <StatCard icon={IndianRupee} label="Vegetable (Month)" value={report ? fmt(report.totals.Vegetable, "₹") : "…"} tint={C.green} />
        <StatCard icon={MilkIcon} label="Milk — Tea vs Pantry (Ltr)" value={`${fmt(totalTea, "Ltr")} / ${fmt(totalPantry, "Ltr")}`} tint="#5B7FBD" />
      </div>

      <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        Weekly MIS — {month}
      </div>
      {!report ? <Empty text="Loading…" /> : (
        <Table>
          <thead>
            <tr>
              <Th>Week</Th>
              {WEEKLY_MIS_LINES.map((line) => <Th key={line} style={{ textAlign: "right" }}>{line} ({WEEKLY_MIS_UNITS[line]})</Th>)}
            </tr>
          </thead>
          <tbody>
            {report.weeks.map((w) => (
              <tr key={w.label}>
                <Td>{w.label}</Td>
                {WEEKLY_MIS_LINES.map((line) => <Td key={line} style={{ textAlign: "right" }}>{fmt(w.values[line], WEEKLY_MIS_UNITS[line])}</Td>)}
              </tr>
            ))}
            <tr>
              <Td style={{ fontWeight: 700 }}>Total</Td>
              {WEEKLY_MIS_LINES.map((line) => <Td key={line} style={{ textAlign: "right", fontWeight: 700 }}>{fmt(report.totals[line], WEEKLY_MIS_UNITS[line])}</Td>)}
            </tr>
            <tr>
              <Td style={{ color: C.sub }}>Target</Td>
              {WEEKLY_MIS_LINES.map((line) => (
                <Td key={line} style={{ textAlign: "right", color: C.sub }}>
                  {report.targets[line] != null ? fmt(report.targets[line], WEEKLY_MIS_UNITS[line]) : "—"}
                </Td>
              ))}
            </tr>
            <tr>
              <Td style={{ color: C.sub }}>Variance</Td>
              {WEEKLY_MIS_LINES.map((line) => {
                const v = report.variance[line];
                return (
                  <Td key={line} style={{ textAlign: "right", color: v == null ? C.faint : v >= 0 ? C.green : C.red, fontWeight: 600 }}>
                    {v != null ? fmt(v, WEEKLY_MIS_UNITS[line]) : "—"}
                  </Td>
                );
              })}
            </tr>
          </tbody>
        </Table>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, marginTop: 26 }}>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            MRP — Monthly Trend
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, height: 260 }}>
            {mrpAnalysis && mrpAnalysis.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mrpAnalysis.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="monthKey" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => "₹" + Number(v).toLocaleString("en-IN")} />
                  <Bar dataKey="amount" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text="No MRP data yet." />}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            MRP by Category — {month}
          </div>
          <Table>
            <thead><tr><Th>Category</Th><Th style={{ textAlign: "right" }}>Amount</Th></tr></thead>
            <tbody>
              {mrpAnalysis && mrpAnalysis.byCategory.length > 0 ? mrpAnalysis.byCategory.map((r) => (
                <tr key={r.name}><Td>{r.name}</Td><Td style={{ textAlign: "right" }}>₹{r.amount.toLocaleString("en-IN")}</Td></tr>
              )) : <tr><td colSpan={2} style={{ padding: "10px 12px", color: C.faint, fontSize: 13.5 }}>No data</td></tr>}
            </tbody>
          </Table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            MRP by Site — {month}
          </div>
          <Table>
            <thead><tr><Th>Site</Th><Th style={{ textAlign: "right" }}>Amount</Th></tr></thead>
            <tbody>
              {mrpAnalysis && mrpAnalysis.bySite.length > 0 ? mrpAnalysis.bySite.map((r) => (
                <tr key={r.name}><Td>{r.name}</Td><Td style={{ textAlign: "right" }}>₹{r.amount.toLocaleString("en-IN")}</Td></tr>
              )) : <tr><td colSpan={2} style={{ padding: "10px 12px", color: C.faint, fontSize: 13.5 }}>No data</td></tr>}
            </tbody>
          </Table>
        </div>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            MRP by Vendor — {month}
          </div>
          <Table>
            <thead><tr><Th>Vendor</Th><Th style={{ textAlign: "right" }}>Amount</Th></tr></thead>
            <tbody>
              {mrpAnalysis && mrpAnalysis.byVendor.length > 0 ? mrpAnalysis.byVendor.map((r) => (
                <tr key={r.name}><Td>{r.name}</Td><Td style={{ textAlign: "right" }}>₹{r.amount.toLocaleString("en-IN")}</Td></tr>
              )) : <tr><td colSpan={2} style={{ padding: "10px 12px", color: C.faint, fontSize: 13.5 }}>No data</td></tr>}
            </tbody>
          </Table>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          Milk — Per-Site Tea vs Pantry Split — {month}
        </div>
        {milkBreakdown === null ? <Empty text="Loading…" /> : milkBreakdown.length === 0 ? <Empty text="No milk entries yet." /> : (
          <Table>
            <thead><tr><Th>Site</Th><Th style={{ textAlign: "right" }}>Tea (Ltr)</Th><Th style={{ textAlign: "right" }}>Pantry (Ltr)</Th><Th style={{ textAlign: "right" }}>Curd (Kg)</Th><Th style={{ textAlign: "right" }}>Buttermilk (pcs)</Th></tr></thead>
            <tbody>
              {milkBreakdown.map((r) => (
                <tr key={r.site}>
                  <Td>{r.site}</Td>
                  <Td style={{ textAlign: "right" }}>{r.teaQty.toLocaleString("en-IN")}</Td>
                  <Td style={{ textAlign: "right", color: r.pantryQty > 0 ? C.amber : C.ink }}>{r.pantryQty.toLocaleString("en-IN")}</Td>
                  <Td style={{ textAlign: "right" }}>{r.curdQty.toLocaleString("en-IN")}</Td>
                  <Td style={{ textAlign: "right" }}>{r.buttermilkQty.toLocaleString("en-IN")}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {showTargets && <TargetsModal targets={targets} onClose={() => setShowTargets(false)} onSaved={() => { setShowTargets(false); load(); }} />}
    </div>
  );
}

function TargetsModal({ targets, onClose, onSaved }: { targets: TargetRow[]; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const line of WEEKLY_MIS_LINES) {
      const existing = targets.find((t) => t.category === line);
      init[line] = existing ? String(existing.monthlyTarget) : "";
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await Promise.all(
      WEEKLY_MIS_LINES.map((line) =>
        fetch("/api/alkesh/mis/targets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: line, monthlyTarget: values[line] === "" ? null : values[line] }),
        })
      )
    );
    setSaving(false);
    onSaved();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,24,22,0.45)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 10, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: 18 }}>
        <h3 style={{ marginTop: 0 }}>Monthly Targets</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {WEEKLY_MIS_LINES.map((line) => (
            <Field key={line} label={`${line} (${WEEKLY_MIS_UNITS[line]}, blank = no target)`}>
              <Input type="number" step="0.01" value={values[line]} onChange={(e) => setValues((v) => ({ ...v, [line]: e.target.value }))} />
            </Field>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </div>
    </div>
  );
}
