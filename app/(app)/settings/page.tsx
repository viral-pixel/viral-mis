"use client";

import { useState } from "react";
import { SectionHead, Field, Input, Btn } from "@/app/components/ui";
import { C } from "@/app/lib/constants";

export default function SettingsPage() {
  return (
    <div>
      <SectionHead title="Settings" sub="Manage your own login" />
      <div style={{ maxWidth: 420 }}>
        <ChangeOwnPassword />
      </div>
    </div>
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
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: C.ink }}>Change your password</h3>
      <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 14 }}>Requires your current password</div>
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
    </div>
  );
}
