"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SectionHead, Btn, Table, Th, Td, Empty, Input, Field, Modal, ConfirmDelete } from "@/app/components/ui";
import { C } from "@/app/lib/constants";

interface SubModule { id: number; name: string; slug: string }
interface ModuleRow { id: number; name: string; subModules: SubModule[]; userAccess: { user: { displayName: string; username: string } }[] }

export default function ModulesAdminPage() {
  const [modules, setModules] = useState<ModuleRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [renaming, setRenaming] = useState<ModuleRow | null>(null);

  const load = () => fetch("/api/admin/modules").then((r) => r.json()).then(setModules);
  useEffect(() => { load(); }, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/admin/modules/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Could not delete module");
  };

  return (
    <div>
      <SectionHead
        title="Modules"
        sub="Top-level responsibility areas (e.g. Ketan Reports). Rename here when ownership changes — no code change needed."
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add Module</Btn>}
      />

      {modules === null ? (
        <Empty text="Loading…" />
      ) : modules.length === 0 ? (
        <Empty text="No modules yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Module</Th>
              <Th>Sub-modules</Th>
              <Th>Assigned Users</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id}>
                <Td>
                  <button onClick={() => setRenaming(m)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontWeight: 600, fontSize: 13.5, padding: 0 }}>
                    {m.name}
                  </button>
                </Td>
                <Td>{m.subModules.length ? m.subModules.map((s) => s.name).join(", ") : <span style={{ color: C.faint }}>None yet</span>}</Td>
                <Td>{m.userAccess.length ? m.userAccess.map((a) => a.user.displayName).join(", ") : <span style={{ color: C.faint }}>None</span>}</Td>
                <Td><ConfirmDelete onConfirm={() => del(m.id)} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showAdd && <AddModuleModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {renaming && <RenameModuleModal module={renaming} onClose={() => setRenaming(null)} onSaved={() => { setRenaming(null); load(); }} />}
    </div>
  );
}

function AddModuleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title="Add Module" onClose={onClose} width={420}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Module Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alkesh Reports" />
        </Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function RenameModuleModal({ module, onClose, onSaved }: { module: ModuleRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(module.name);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/admin/modules/${module.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title="Rename Module" onClose={onClose} width={420}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Module Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
