"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, FONT_HEAD, FONT_BODY } from "@/app/lib/constants";
import { Field, Input, Btn } from "@/app/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT_BODY }}>
      <form onSubmit={submit} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: FONT_HEAD, color: C.ink, fontSize: 22, letterSpacing: "0.03em", textTransform: "uppercase" }}>NCS MIS</div>
          <div style={{ color: C.sub, fontSize: 12.5, marginTop: 2 }}>Sign in to continue</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Username">
            <Input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
          <Btn type="submit" disabled={busy} style={{ justifyContent: "center", marginTop: 4 }}>
            {busy ? "Signing in…" : "Sign in"}
          </Btn>
        </div>
      </form>
    </div>
  );
}
