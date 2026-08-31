"use client";

import { ReactNode, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { C, FONT_HEAD, FONT_BODY, FONT_MONO } from "@/app/lib/constants";

// Inline two-click delete confirmation (avoids native confirm() dialogs,
// which are poor UX and don't play well with automated browser testing).
export function ConfirmDelete({ onConfirm, title = "Delete?" }: { onConfirm: () => void; title?: string }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
        <span style={{ color: C.sub }}>{title}</span>
        <button
          onClick={() => { setConfirming(false); onConfirm(); }}
          style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontWeight: 600, fontSize: 11.5 }}
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11.5, color: C.sub }}
        >
          No
        </button>
      </span>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red }}>
      <Trash2 size={14} />
    </button>
  );
}

export function Btn({
  children,
  onClick,
  variant = "default",
  type = "button",
  style,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "ghost" | "danger" | "plain";
  type?: "button" | "submit";
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
  const variants: Record<string, React.CSSProperties> = {
    default: { background: C.teal, color: "#fff" },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.border}` },
    danger: { background: C.redSoft, color: C.red, border: `1px solid ${C.red}33` },
    plain: { background: "transparent", color: C.sub, padding: "6px 8px" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: FONT_BODY }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: 13.5,
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: "#fff",
  color: C.ink,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", ...(props.style || {}) }} />;
}

export function Tag({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 4,
        color,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: "36px 12px", textAlign: "center", color: C.faint, fontFamily: FONT_BODY, fontSize: 13.5 }}>
      {text}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  width = 620,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,24,22,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px",
        overflowY: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ background: "#fff", borderRadius: 10, width, maxWidth: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <h3 style={{ margin: 0, fontFamily: FONT_HEAD, fontSize: 18, letterSpacing: "0.02em", color: C.ink, textTransform: "uppercase" }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.sub }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18, maxHeight: "78vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: ReactNode;
  tint: string;
}) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", flex: "1 1 160px", minWidth: 150 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: tint + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={tint} />
        </div>
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 26, color: C.ink }}>{value}</div>
    </div>
  );
}

export function SectionHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          {title}
        </h2>
        {sub && <div style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "9px 12px",
        fontSize: 11,
        fontWeight: 700,
        color: C.sub,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        borderBottom: `1px solid ${C.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}
export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "10px 12px", fontSize: 13.5, color: C.ink, borderBottom: `1px solid ${C.border}`, ...style }}>
      {children}
    </td>
  );
}
export function Table({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  );
}

export function Pager({
  page,
  setPage,
  total,
  pageSize,
}: {
  page: number;
  setPage: (p: number) => void;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 12, fontSize: 13, color: C.sub }}>
      <span>
        {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <button
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, padding: 4, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}
      >
        <ChevronLeft size={14} />
      </button>
      <span>
        Page {page} / {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, padding: 4, cursor: page >= pages ? "not-allowed" : "pointer", opacity: page >= pages ? 0.4 : 1 }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// Bulk-delete confirmation, shared across every table that gets a "Clear
// Data" admin tool (test-data cleanup before going live). apiBase must be
// an endpoint accepting GET (returns { count }) and DELETE (returns
// { deleted }), both taking optional from/to=YYYY-MM query params — see
// e.g. app/api/vegetable/purchases/clear/route.ts. Requires typing CLEAR
// before the delete button enables, on top of the two-step nature of
// opening this modal at all.
export function ClearDataModal({
  title, apiBase, onClose, onCleared,
}: {
  title: string; apiBase: string; onClose: () => void; onCleared: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  const qs = () => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  };

  useEffect(() => {
    setLoadingCount(true);
    setCount(null);
    fetch(`${apiBase}?${qs()}`)
      .then((r) => r.json())
      .then((d) => setCount(typeof d.count === "number" ? d.count : null))
      .finally(() => setLoadingCount(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const doClear = async () => {
    setClearing(true);
    const res = await fetch(`${apiBase}?${qs()}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setClearing(false);
    if (res.ok) {
      alert(`Deleted ${d.deleted.toLocaleString("en-IN")} entr${d.deleted === 1 ? "y" : "ies"}.`);
      onCleared();
      onClose();
    } else {
      alert(d.error || "Could not clear data");
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ color: C.sub, fontSize: 13 }}>Leave both blank to clear everything in this table. This cannot be undone.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="From (optional)"><Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To (optional)"><Input type="month" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div style={{ background: "#FBF0DD", border: "1px solid #B9770E", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: C.ink }}>
          {loadingCount ? "Counting…" : count == null ? "Could not count — try again." : `This will permanently delete ${count.toLocaleString("en-IN")} entr${count === 1 ? "y" : "ies"}.`}
        </div>
        <Field label="Type CLEAR to confirm">
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CLEAR" />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" onClick={doClear} disabled={clearing || confirmText !== "CLEAR" || !count}>
            {clearing ? "Deleting…" : "Delete Permanently"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
