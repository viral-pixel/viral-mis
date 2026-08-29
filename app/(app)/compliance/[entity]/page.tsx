"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { Plus, Download, Upload } from "lucide-react";
import { COMPLIANCE_ENTITIES, getEntityConfig, entityRowTitle, isRecordClosed, type EntityConfig } from "@/app/lib/complianceEntities";
import { getExpiryStatus, EXPIRY_STATUS_LABEL, EXPIRY_STATUS_STYLE } from "@/app/lib/expiry";
import { C, FONT_HEAD } from "@/app/lib/constants";
import { Btn, Modal, Field, Input, Select, Textarea, Table, Th, Td, Tag, Empty, ConfirmDelete, SectionHead } from "@/app/components/ui";

type Row = Record<string, any>;

function toDateInputValue(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EntityPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity: entitySlug } = use(params);
  const entity = getEntityConfig(entitySlug);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin)).catch(() => {});
  }, []);

  const load = () => {
    if (!entity) return;
    setLoading(true);
    fetch(`/api/compliance/${entity.slug}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entitySlug]);

  if (!entity) return <Empty text="Unknown sub-section" />;

  const del = async (id: number) => {
    const res = await fetch(`/api/compliance/${entity.slug}/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not delete");
    }
  };

  return (
    <div>
      <SectionHead
        title="Ketan Reports"
        sub="Agreements, Licenses & Insurance — mirrors the original MIS Excel workbook"
        action={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <a href={`/api/compliance/${entity.slug}/export`} style={{ textDecoration: "none" }}>
              <Btn variant="ghost"><Download size={15} /> Export</Btn>
            </a>
            <label style={{ display: "inline-flex" }}>
              <Btn variant="ghost" onClick={() => document.getElementById(`import-${entity.slug}`)?.click()}>
                <Upload size={15} /> Import
              </Btn>
              <input
                id={`import-${entity.slug}`}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch(`/api/compliance/${entity.slug}/import`, { method: "POST", body: fd });
                  const d = await res.json().catch(() => ({}));
                  if (res.ok) {
                    alert(`Imported ${d.created} row(s).${d.errors?.length ? ` ${d.errors.length} error(s).` : ""}`);
                    load();
                  } else {
                    alert(d.error || "Import failed");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={15} /> Add {entity.label}
            </Btn>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {COMPLIANCE_ENTITIES.map((e) => (
          <Link
            key={e.slug}
            href={`/compliance/${e.slug}`}
            style={{
              padding: "7px 12px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
              background: e.slug === entity.slug ? C.teal : "#fff",
              color: e.slug === entity.slug ? "#fff" : C.ink,
              border: `1px solid ${e.slug === entity.slug ? C.teal : C.border}`,
            }}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {loading ? (
        <Empty text="Loading…" />
      ) : rows.length === 0 ? (
        <Empty text={`No ${entity.label} records yet.`} />
      ) : (
        <Table>
          <thead>
            <tr>
              {entity.fields.map((f) => (
                <Th key={f.key}>{f.label}</Th>
              ))}
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {entity.fields.map((f) => (
                  <Td key={f.key}>{formatValue(f, row[f.key])}</Td>
                ))}
                <Td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {entity.expiryFields.map((ef) => {
                      const status = getExpiryStatus(row[ef.key] ? new Date(row[ef.key]) : null);
                      if (status === "no_date") return null;
                      const remindersOff = row.needsReminder === false;
                      const style = remindersOff
                        ? EXPIRY_STATUS_STYLE.no_date
                        : EXPIRY_STATUS_STYLE[status];
                      return (
                        <span
                          key={ef.key}
                          title={remindersOff ? `${ef.label} — reminders turned off for this record` : ef.label}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: `1px solid ${style.border}`,
                            width: "fit-content",
                            background: style.background,
                            color: style.color,
                          }}
                        >
                          {entity.expiryFields.length > 1 ? `${ef.label}: ` : ""}
                          {EXPIRY_STATUS_LABEL[status]}
                          {remindersOff ? " (reminders off)" : ""}
                        </span>
                      );
                    })}
                  </div>
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      onClick={() => { setEditing(row); setShowForm(true); }}
                      style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(row.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && (
        <EntityForm
          entity={entity}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function formatValue(field: { type: string }, value: unknown) {
  if (field.type === "boolean") {
    return value ? (
      <span style={{ color: C.green, fontWeight: 600 }}>Yes</span>
    ) : (
      <span style={{ color: C.faint }}>No</span>
    );
  }
  if (value === null || value === undefined || value === "") return <span style={{ color: C.faint }}>—</span>;
  if (field.type === "date") {
    const d = new Date(value as string);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (field.type === "number") return String(value);
  return String(value);
}

function EntityForm({
  entity,
  initial,
  onClose,
  onSaved,
}: {
  entity: EntityConfig;
  initial: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Row>(() => {
    const v: Row = {};
    for (const f of entity.fields) {
      if (f.key === "needsReminder") {
        v[f.key] = initial ? initial[f.key] !== false : true;
        continue;
      }
      const raw = initial ? initial[f.key] : "";
      v[f.key] = f.type === "date" ? toDateInputValue(raw) : raw ?? "";
    }
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Once the user manually touches the reminders checkbox themselves, stop
  // auto-adjusting it when the status field changes — their explicit choice
  // wins over the suggestion.
  const [reminderTouched, setReminderTouched] = useState(false);

  const set = (key: string, val: unknown) => {
    setValues((v) => {
      const next = { ...v, [key]: val };
      if (
        entity.closedStatusField &&
        key === entity.closedStatusField.key &&
        !reminderTouched
      ) {
        next.needsReminder = !isRecordClosed(entity, val);
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/compliance/${entity.slug}/${initial.id}` : `/api/compliance/${entity.slug}`;
    const method = initial ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? `Edit ${entity.label}` : `Add ${entity.label}`} onClose={onClose} width={720}>
      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {entity.fields.map((f) => (
          <div key={f.key} style={{ gridColumn: f.type === "longtext" || f.type === "boolean" ? "1 / -1" : undefined }}>
            {f.type === "boolean" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.ink, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={(e) => { setReminderTouched(true); set(f.key, e.target.checked); }}
                />
                {f.label}
                {entity.closedStatusField && !values[f.key] && (
                  <span style={{ color: C.sub, fontSize: 12 }}>
                    (suggested off — {entity.closedStatusField.key === "siteStatus" ? "site" : "record"} marked closed)
                  </span>
                )}
              </label>
            ) : (
              <Field label={f.label}>
                {f.type === "longtext" ? (
                  <Textarea rows={2} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                ) : f.type === "select" ? (
                  <Select value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </Field>
            )}
          </div>
        ))}
        {error && <div style={{ gridColumn: "1 / -1", color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
