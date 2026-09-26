"use client";

import { useEffect, useState } from "react";
import { Upload, IndianRupee, AlertTriangle } from "lucide-react";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Select, Tag, ConfirmDelete } from "@/app/components/ui";
import { C } from "@/app/lib/constants";

type Cell = string | number | null;
interface SnapshotMeta { id: number; asOnLabel: string; fileName: string; uploadedByName: string; uploadedAt: string }
interface Selected {
  id: number; title: string; asOnLabel: string; fileName: string; uploadedByName: string; uploadedAt: string;
  summary: { label: string; value: Cell }[]; columns: string[]; rows: Cell[][];
}
interface Payload { canUpload: boolean; isAdmin: boolean; snapshots: SnapshotMeta[]; selected: Selected | null }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRupee(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
// Display only — every number shown here is exactly what was in the uploaded
// file; nothing is added up or derived on our side.
const PLAIN_COLUMN = /sr\.?\s*no|priority/i;
const TEXT_LIMIT_COLUMN = /remarks|conversation|update|action/i;

export default function OutstandingTrackerPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = (id?: number) =>
    fetch(`/api/outstanding${id ? `?id=${id}` : ""}`)
      .then((r) => { if (r.status === 403) { setForbidden(true); return null; } return r.json(); })
      .then((d) => d && setData(d));
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/outstanding", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) {
      if (d.warnings?.length) alert(d.warnings.join("\n"));
      load(d.id);
    } else alert(d.error || "Upload failed");
  };

  const del = async (id: number) => {
    const res = await fetch(`/api/outstanding/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  if (forbidden) return <Empty text="Not authorized for the Outstanding Payment Tracker." />;
  if (!data) return <Empty text="Loading…" />;

  const sel = data.selected;

  return (
    <div>
      <SectionHead
        title="Outstanding Payment Tracker"
        sub="Sandip's party-wise outstanding sheet, shown exactly as uploaded — nothing is calculated here."
        action={data.canUpload && (
          <label style={{ display: "inline-flex" }}>
            <Btn onClick={() => document.getElementById("outstanding-upload")?.click()} disabled={uploading}>
              <Upload size={15} /> {uploading ? "Uploading…" : "Upload Excel"}
            </Btn>
            <input
              id="outstanding-upload" type="file" accept=".xlsx,.xls" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
            />
          </label>
        )}
      />

      {!sel ? (
        <Empty text={data.canUpload ? "Nothing uploaded yet — use Upload Excel to add the first file." : "Nothing has been uploaded yet."} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 6 }}>
            <Field label="Snapshot">
              <Select value={sel.id} onChange={(e) => load(Number(e.target.value))} style={{ width: 380 }}>
                {data.snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.asOnLabel || `Uploaded ${fmtDateTime(s.uploadedAt)}`)} — by {s.uploadedByName || "—"}, {fmtDateTime(s.uploadedAt)}
                  </option>
                ))}
              </Select>
            </Field>
            {data.isAdmin && <ConfirmDelete title="Delete this snapshot?" onConfirm={() => del(sel.id)} />}
          </div>
          <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 18 }}>
            {sel.title}{sel.asOnLabel ? ` · ${sel.asOnLabel}` : ""} · file: {sel.fileName}
          </div>

          {sel.summary.length > 0 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              {sel.summary.map((s) => {
                const isCount = /cases|count/i.test(s.label);
                const value = typeof s.value === "number" ? (isCount ? String(s.value) : fmtRupee(s.value)) : (s.value ?? "—");
                return (
                  <StatCard
                    key={s.label}
                    icon={isCount ? AlertTriangle : IndianRupee}
                    label={s.label}
                    value={value}
                    tint={isCount ? C.red : s.label.toLowerCase().includes("total") ? C.teal : C.amber}
                  />
                );
              })}
            </div>
          )}

          <Table>
            <thead>
              <tr>
                {sel.columns.map((col, i) => (
                  <Th key={i} style={{ textAlign: i > 0 && !PLAIN_COLUMN.test(col) && !TEXT_LIMIT_COLUMN.test(col) && i !== 1 ? "right" : "left" }}>{col}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sel.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((v, i) => {
                    const col = sel.columns[i] ?? "";
                    if (v === null) return <Td key={i} style={{ color: C.faint, textAlign: i > 1 && !TEXT_LIMIT_COLUMN.test(col) && !PLAIN_COLUMN.test(col) ? "right" : "left" }}>—</Td>;
                    if (typeof v === "number") {
                      const plain = PLAIN_COLUMN.test(col) || i === 0;
                      return <Td key={i} style={{ textAlign: plain ? "left" : "right" }}>{plain ? v : fmtRupee(v)}</Td>;
                    }
                    if (/action required/i.test(col)) {
                      return <Td key={i}>{/^yes$/i.test(v) ? <Tag color={C.red} bg={C.redSoft}>YES</Tag> : <span style={{ color: C.sub }}>{v}</span>}</Td>;
                    }
                    if (i === 1) return <Td key={i} style={{ fontWeight: 600, minWidth: 180 }}>{v}</Td>;
                    return <Td key={i} style={TEXT_LIMIT_COLUMN.test(col) ? { minWidth: 220, maxWidth: 340 } : undefined}>{v}</Td>;
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
