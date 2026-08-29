"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SectionHead, Btn, Table, Th, Td, Empty, Input, Field, Modal, Tag, ConfirmDelete } from "@/app/components/ui";
import { C } from "@/app/lib/constants";

interface ModuleOpt { id: number; name: string }
interface UserRow { id: number; username: string; displayName: string; isAdmin: boolean; moduleIds: number[] }

function randomPasswordClient() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [modules, setModules] = useState<ModuleOpt[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [lastPassword, setLastPassword] = useState<{ username: string; password: string } | null>(null);

  const load = () => fetch("/api/admin/users").then((r) => r.json()).then(setUsers);
  useEffect(() => {
    load();
    fetch("/api/admin/modules").then((r) => r.json()).then((mods) => setModules(mods.map((m: ModuleOpt) => ({ id: m.id, name: m.name }))));
  }, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not delete"); }
  };

  const moduleNames = (ids: number[]) => modules.filter((m) => ids.includes(m.id)).map((m) => m.name).join(", ") || "—";

  return (
    <div>
      <SectionHead
        title="Users & Access"
        sub="Individual employee logins. Each can be assigned to one or more modules — they'll only see and enter data for those."
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add User</Btn>}
      />

      {lastPassword && (
        <div style={{ background: C.tealSoft, border: `1px solid ${C.teal}55`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13.5 }}>
          Password for <strong>{lastPassword.username}</strong>: <code style={{ fontFamily: "monospace", fontSize: 14 }}>{lastPassword.password}</code>
          <div style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>Shown once — share it with them now. It won&apos;t be shown again.</div>
        </div>
      )}

      {users === null ? (
        <Empty text="Loading…" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Username</Th>
              <Th>Display Name</Th>
              <Th>Role</Th>
              <Th>Modules</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.username}</Td>
                <Td>{u.displayName}</Td>
                <Td>{u.isAdmin ? <Tag color={C.teal} bg={C.tealSoft}>ADMIN</Tag> : <Tag color={C.sub} bg={C.bg}>ENTRY</Tag>}</Td>
                <Td>{u.isAdmin ? "All (Admin)" : moduleNames(u.moduleIds)}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button onClick={() => setEditing(u)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    <ConfirmDelete onConfirm={() => del(u.id)} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showAdd && (
        <UserForm
          modules={modules}
          onClose={() => setShowAdd(false)}
          onSaved={(pw) => { setShowAdd(false); load(); if (pw) setLastPassword(pw); }}
        />
      )}
      {editing && (
        <UserForm
          modules={modules}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(pw) => { setEditing(null); load(); if (pw) setLastPassword(pw); }}
        />
      )}
    </div>
  );
}

function UserForm({
  modules,
  initial,
  onClose,
  onSaved,
}: {
  modules: ModuleOpt[];
  initial?: UserRow;
  onClose: () => void;
  onSaved: (pw?: { username: string; password: string }) => void;
}) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [moduleIds, setModuleIds] = useState<number[]>(initial?.moduleIds ?? []);
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleModule = (id: number) =>
    setModuleIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    if (initial) {
      const res = await fetch(`/api/admin/users/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName, isAdmin, moduleIds,
          newPassword: changePassword && newPassword ? newPassword : undefined,
          resetPassword: changePassword && !newPassword,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) onSaved(d.generatedPassword ? { username: initial.username, password: d.generatedPassword } : undefined);
      else { setError(d.error || "Could not save"); setSaving(false); }
    } else {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, isAdmin, moduleIds }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) onSaved({ username: d.username, password: d.generatedPassword });
      else { setError(d.error || "Could not save"); setSaving(false); }
    }
  };

  return (
    <Modal title={initial ? `Edit ${initial.displayName}` : "Add User"} onClose={onClose} width={480}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!initial && (
          <Field label="Username">
            <Input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. ketan" />
          </Field>
        )}
        <Field label="Display Name">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Ketan Patel" />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.ink }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Admin (full access to every module)
        </label>
        {!isAdmin && (
          <Field label="Assigned Modules">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {modules.length === 0 && <span style={{ color: C.faint, fontSize: 13 }}>No modules exist yet.</span>}
              {modules.map((m) => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                  <input type="checkbox" checked={moduleIds.includes(m.id)} onChange={() => toggleModule(m.id)} />
                  {m.name}
                </label>
              ))}
            </div>
          </Field>
        )}
        {initial && (
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.ink }}>
              <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} />
              Set a new password
            </label>
            {changePassword && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate one"
                  minLength={8}
                />
                <Btn variant="ghost" onClick={() => setNewPassword(randomPasswordClient())}>Generate</Btn>
              </div>
            )}
          </div>
        )}
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
