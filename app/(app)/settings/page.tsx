"use client";

import { useEffect, useState } from "react";
import { SectionHead, Field, Input, Select, Btn } from "@/app/components/ui";
import { C } from "@/app/lib/constants";

export default function SettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin)).catch(() => {});
  }, []);

  return (
    <div>
      <SectionHead title="Settings" sub="Manage login access" />
      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 16, maxWidth: 900 }}>
        <ChangeOwnPassword />
        {isAdmin && <ResetTeammatePassword />}
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: C.ink }}>{title}</h3>
      <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 14 }}>{sub}</div>
      {children}
    </div>
  );
}

function ResetTeammatePassword() {
  const [users, setUsers] = useState<{ username: string; displayName: string }[]>([]);
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((all) => {
      fetch("/api/auth/me").then((r) => r.json()).then((me) => {
        const others = (all || []).filter((u: { username: string }) => u.username !== me.user?.username);
        setUsers(others);
        if (others[0]) setUsername(others[0].username);
      });
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "New password and confirmation don't match." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset-user-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, newPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not reset password" });
      return;
    }
    setMsg({ ok: true, text: `Password reset for ${username}. Let them know the new password.` });
    setNewPassword(""); setConfirm("");
  };

  return (
    <Card title="Reset a teammate's password" sub="Admin-only — set a new password for someone if they forget theirs">
      {users.length === 0 ? (
        <div style={{ color: C.sub, fontSize: 13 }}>No other accounts yet.</div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Account">
            <Select value={username} onChange={(e) => setUsername(e.target.value)}>
              {users.map((u) => <option key={u.username} value={u.username}>{u.displayName} ({u.username})</option>)}
            </Select>
          </Field>
          <Field label="New password (min 8 characters)">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} />
          </Field>
          {msg && <div style={{ color: msg.ok ? C.green : C.red, fontSize: 13 }}>{msg.text}</div>}
          <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Reset their password"}</Btn>
        </form>
      )}
    </Card>
  );
}

function ChangeOwnPassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "New password and confirmation don't match." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not change password" });
      return;
    }
    setMsg({ ok: true, text: "Password changed." });
    setCurrentPassword(""); setNewPassword(""); setConfirm("");
  };

  return (
    <Card title="Change your password" sub="Requires your current password">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Current password">
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label="New password (min 8 characters)">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} />
        </Field>
        {msg && <div style={{ color: msg.ok ? C.green : C.red, fontSize: 13 }}>{msg.text}</div>}
        <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Btn>
      </form>
    </Card>
  );
}
