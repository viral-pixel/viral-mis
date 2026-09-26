"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, RefreshCw, Clock, FileSpreadsheet, IndianRupee, AlertTriangle, CalendarClock } from "lucide-react";
import { SectionHead, Btn, Empty, Modal } from "@/app/components/ui";
import { C, FONT_HEAD } from "@/app/lib/constants";

type Cell = string | number | null;
interface Selected {
  id: number; title: string; asOnLabel: string; fileName: string; uploadedByName: string; uploadedAt: string;
  summary: { label: string; value: Cell }[]; columns: string[]; rows: Cell[][];
}
interface Payload { canUpload: boolean; selected: Selected | null }

// Upload date AND time, always in India time regardless of the viewer's
// machine (2026-09-26, user's request: every upload's date and time recorded).
function fmtUploaded(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return `${date}, ${time}`;
}
function fmtRupee(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// Presentation only — every figure shown is exactly what was in the uploaded
// file; nothing is added up or derived here.
const PLAIN_COL = /sr\.?\s*no|priority/i;
const TEXT_COL = /remarks|conversation|update|action/i;

// Sticky frozen columns (Sr. No. + Party Name), sticky header row, zebra and
// hover — plain CSS because inline styles can't express :hover / nth-child.
const TABLE_CSS = `
.ot{border-collapse:separate;border-spacing:0;width:100%;min-width:1280px;font-family:inherit}
.ot th{position:sticky;top:0;z-index:3;background:#F3F1E8;color:#6E7269;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:12px 14px;text-align:left;white-space:nowrap;border-bottom:1px solid #E2DFD5}
.ot td{padding:12px 14px;font-size:13.5px;color:#1E2420;border-bottom:1px solid #EEEBE1;vertical-align:top;line-height:1.45}
.ot tbody tr{background:#fff}
.ot tbody tr:nth-child(even){background:#FBFAF6}
.ot tbody tr:hover{background:#EAF5F1}
.ot .c0{position:sticky;left:0;z-index:2;background:inherit;width:58px;min-width:58px;max-width:58px;color:#6E7269;text-align:center}
.ot .c1{position:sticky;left:58px;z-index:2;background:inherit;width:240px;min-width:240px;max-width:240px;font-weight:600;box-shadow:8px 0 8px -6px rgba(30,36,32,.16)}
.ot th.c0,.ot th.c1{z-index:5;background:#F3F1E8}
.ot .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ot th.num{text-align:right}
.ot td.total{font-weight:700;background-image:linear-gradient(rgba(19,151,127,.07),rgba(19,151,127,.07))}
.ot td.text{min-width:240px;max-width:420px}
.ot tr.flag td.c0{box-shadow:inset 4px 0 0 #B3423A}
.ot .muted{color:#B5B7AE}
`;

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color, background: bg, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
      {children}
    </span>
  );
}

function SummaryCard({ label, value, kind }: { label: string; value: Cell; kind: "hero" | "month" | "case" | "old" }) {
  const isCount = kind === "case";
  const shown = typeof value === "number" ? (isCount ? String(value) : fmtRupee(value)) : (value ?? "—");
  if (kind === "hero") {
    return (
      <div style={{ flex: "1.4 1 280px", borderRadius: 14, padding: "18px 22px", color: "#fff", background: `linear-gradient(135deg, ${C.tealDark}, ${C.teal})`, boxShadow: `0 8px 22px ${C.teal}44` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.85 }}>
          <IndianRupee size={14} /> {label}
        </div>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 38, lineHeight: 1.15, marginTop: 8 }}>{shown}</div>
      </div>
    );
  }
  const accent = kind === "case" ? C.red : kind === "old" ? C.faint : C.amber;
  const soft = kind === "case" ? C.redSoft : kind === "old" ? C.bg : C.amberSoft;
  const Icon = kind === "case" ? AlertTriangle : CalendarClock;
  return (
    <div style={{ flex: "1 1 150px", borderRadius: 14, padding: "14px 16px", background: "#fff", border: `1px solid ${C.border}`, borderTop: `4px solid ${accent}`, boxShadow: "0 2px 8px rgba(30,36,32,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: soft, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={accent} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.25 }}>{label}</span>
      </div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 26, color: kind === "case" ? C.red : C.ink, marginTop: 10 }}>{shown}</div>
    </div>
  );
}

export default function OutstandingTrackerPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () =>
    fetch("/api/outstanding")
      .then((r) => { if (r.status === 403) { setForbidden(true); return null; } return r.json(); })
      .then((d) => d && setData(d));
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setPending(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/outstanding", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) {
      if (d.warnings?.length) alert(d.warnings.join("\n"));
      load();
    } else alert(d.error || "Upload failed");
  };

  // First upload goes straight through; replacing an existing one asks first.
  const onPicked = (file: File) => {
    if (data?.selected) setPending(file); else upload(file);
  };

  if (forbidden) return <Empty text="Not authorized for the Outstanding Payment Tracker." />;
  if (!data) return <Empty text="Loading…" />;

  const sel = data.selected;
  const uploadButton = data.canUpload && (
    <>
      <Btn onClick={() => fileInput.current?.click()} disabled={uploading}>
        {sel ? <RefreshCw size={15} /> : <Upload size={15} />} {uploading ? "Uploading…" : sel ? "Upload New File" : "Upload Excel"}
      </Btn>
      <input ref={fileInput} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPicked(f); e.target.value = ""; }} />
    </>
  );

  return (
    <div>
      <style>{TABLE_CSS}</style>
      <SectionHead title="Outstanding Payment Tracker" sub="Sandip's party-wise outstanding sheet, shown exactly as uploaded — nothing is calculated here." />

      {!sel ? (
        <div style={{ border: `2px dashed ${C.border}`, borderRadius: 16, background: "#fff", padding: "56px 20px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.tealSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <FileSpreadsheet size={28} color={C.teal} />
          </div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 22, textTransform: "uppercase", letterSpacing: "0.02em" }}>No file uploaded yet</div>
          <div style={{ color: C.sub, fontSize: 13.5, margin: "6px 0 18px" }}>
            {data.canUpload ? "Upload the finished Excel and it appears here exactly as prepared." : "Nothing has been uploaded yet."}
          </div>
          {uploadButton}
        </div>
      ) : (
        <>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderLeft: `5px solid ${C.teal}`, borderRadius: 14, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18, boxShadow: "0 2px 8px rgba(30,36,32,0.05)" }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>{sel.title || "Party-wise outstanding payment status"}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 30, lineHeight: 1.2, marginTop: 2 }}>{sel.asOnLabel || "Latest upload"}</div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: C.sub, fontSize: 12.5, marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} color={C.teal} /> Uploaded <strong style={{ color: C.ink }}>{fmtUploaded(sel.uploadedAt)}</strong> by {sel.uploadedByName || "—"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FileSpreadsheet size={14} color={C.teal} /> {sel.fileName}
                </span>
              </div>
            </div>
            <div>{uploadButton}</div>
          </div>

          {sel.summary.length > 0 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              {sel.summary.map((s, i) => {
                const kind = /^total/i.test(s.label) ? "hero" : /cases|count/i.test(s.label) ? "case" : /old/i.test(s.label) ? "old" : "month";
                return <SummaryCard key={i} label={s.label} value={s.value} kind={kind} />;
              })}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "auto", maxHeight: "calc(100vh - 330px)", minHeight: 300, boxShadow: "0 2px 8px rgba(30,36,32,0.05)" }}>
            <table className="ot">
              <thead>
                <tr>
                  {sel.columns.map((col, i) => {
                    const num = i > 1 && !PLAIN_COL.test(col) && !TEXT_COL.test(col);
                    return <th key={i} className={`${i === 0 ? "c0" : i === 1 ? "c1" : ""} ${num ? "num" : ""}`.trim()}>{col}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {sel.rows.map((row, r) => {
                  const actionIdx = sel.columns.findIndex((c) => /action required/i.test(c));
                  const flagged = actionIdx >= 0 && typeof row[actionIdx] === "string" && /^yes$/i.test(row[actionIdx] as string);
                  return (
                    <tr key={r} className={flagged ? "flag" : ""}>
                      {row.map((v, i) => {
                        const col = sel.columns[i] ?? "";
                        const isNum = i > 1 && !PLAIN_COL.test(col) && !TEXT_COL.test(col);
                        const isText = TEXT_COL.test(col) && !/action required/i.test(col);
                        const cls = [i === 0 ? "c0" : i === 1 ? "c1" : "", isNum ? "num" : "", isNum && /^total/i.test(col) ? "total" : "", isText ? "text" : ""].filter(Boolean).join(" ");
                        let content: React.ReactNode;
                        if (v === null) content = <span className="muted">—</span>;
                        else if (typeof v === "number") content = i === 0 || PLAIN_COL.test(col) ? v : (v === 0 ? <span className="muted">{fmtRupee(v)}</span> : fmtRupee(v));
                        else if (/action required/i.test(col)) content = /^yes$/i.test(v) ? <Pill color={C.red} bg={C.redSoft}>Yes</Pill> : <Pill color={C.sub} bg={C.bg}>{v}</Pill>;
                        else if (/priority/i.test(col)) content = <Pill color={/high/i.test(v) ? C.red : /med/i.test(v) ? C.amber : C.green} bg={/high/i.test(v) ? C.redSoft : /med/i.test(v) ? C.amberSoft : C.greenSoft}>{v}</Pill>;
                        else content = v;
                        return <td key={i} className={cls}>{content}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ color: C.faint, fontSize: 11.5, marginTop: 8 }}>Scroll sideways — Sr. No. and Party Name stay in place.</div>
        </>
      )}

      {pending && (
        <Modal title="Replace current file?" onClose={() => setPending(null)} width={460}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13.5 }}>
            <div>
              This replaces the file uploaded on <strong>{sel ? fmtUploaded(sel.uploadedAt) : ""}</strong> ({sel?.asOnLabel || sel?.fileName}) with{" "}
              <strong>{pending.name}</strong>. The old one is not kept.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost" onClick={() => setPending(null)}>Cancel</Btn>
              <Btn onClick={() => upload(pending)}>Replace</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
