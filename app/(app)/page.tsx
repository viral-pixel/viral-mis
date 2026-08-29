"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, FileStack } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { SectionHead, StatCard, Empty } from "@/app/components/ui";
import { ReminderList } from "@/app/components/ReminderList";
import { C, FONT_BODY } from "@/app/lib/constants";
import { EXPIRY_STATUS_LABEL, EXPIRY_STATUS_STYLE, type ExpiryReminder } from "@/app/lib/expiry";
import { COMPLIANCE_SUBMODULE_SLUG } from "@/app/lib/complianceEntities";
import type { ComplianceStats } from "@/app/lib/complianceReminders";

interface DashboardData {
  stats: Record<string, ComplianceStats>;
  reminders: ExpiryReminder[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ stats: {}, reminders: [] }));
  }, []);

  if (!data) return <Empty text="Loading dashboard…" />;

  const compliance = data.stats[COMPLIANCE_SUBMODULE_SLUG];

  if (!compliance) {
    return (
      <div>
        <SectionHead title="Dashboard" sub="No modules assigned to your account yet — ask your Admin for access." />
        <Empty text="Nothing to show yet." />
      </div>
    );
  }

  const statusPieData = (["expired", "expiring_soon", "active", "no_date"] as const)
    .map((s) => ({ name: EXPIRY_STATUS_LABEL[s], value: compliance.statusBreakdown[s], color: EXPIRY_STATUS_STYLE[s].color }))
    .filter((d) => d.value > 0);

  return (
    <div>
      <SectionHead title="Dashboard" sub="Ketan Reports — Agreements, Licenses & Insurance" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <StatCard icon={FileStack} label="Total Records" value={compliance.totalRecords} tint={C.teal} />
        <StatCard icon={XCircle} label="Expired" value={compliance.statusBreakdown.expired} tint={C.red} />
        <StatCard icon={AlertTriangle} label="Expiring Soon (60d)" value={compliance.statusBreakdown.expiring_soon} tint={C.amber} />
        <StatCard icon={CheckCircle2} label="Active" value={compliance.statusBreakdown.active} tint={C.green} />
      </div>
      {compliance.remindersSuppressedCount > 0 && (
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 22 }}>
          {compliance.remindersSuppressedCount} record{compliance.remindersSuppressedCount === 1 ? "" : "s"} excluded from the counts above — reminders turned off (typically closed sites/contracts).
        </div>
      )}
      {compliance.remindersSuppressedCount === 0 && <div style={{ marginBottom: 22 }} />}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 22, alignItems: "stretch" }}>
        <ChartPanel title="Records by Table" sub="How your data is distributed across the 8 tracked areas">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={compliance.recordsByEntity} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={170} tick={{ fontFamily: FONT_BODY, fontSize: 11.5, fill: C.ink }} />
              <Tooltip contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Bar dataKey="count" fill={C.teal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Status Breakdown" sub="Across all tracked expiry dates">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusPieData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontFamily: FONT_BODY, fontSize: 12 }} />
              <Tooltip contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <ChartPanel title="Upcoming Expiries by Month" sub="Expired or due within 60 days, grouped by month" style={{ marginBottom: 22 }}>
        {compliance.upcomingExpiriesByMonth.length === 0 ? (
          <Empty text="Nothing expired or expiring soon." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compliance.upcomingExpiriesByMonth} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Bar dataKey="count" fill={C.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <div style={{ marginBottom: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 15, color: C.ink }}>Nearest reminders</h3>
        <a href="/reminders" style={{ fontSize: 12.5, color: C.teal, textDecoration: "none", fontWeight: 600 }}>View all →</a>
      </div>
      <ReminderList reminders={data.reminders} limit={6} />
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
