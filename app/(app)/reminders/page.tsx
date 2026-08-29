"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHead, Empty } from "@/app/components/ui";
import { ReminderList } from "@/app/components/ReminderList";
import { COMPLIANCE_ENTITIES } from "@/app/lib/complianceEntities";
import { C } from "@/app/lib/constants";
import type { ExpiryReminder } from "@/app/lib/expiry";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ExpiryReminder[] | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>("all");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setReminders(d.reminders ?? []))
      .catch(() => setReminders([]));
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reminders ?? []) map[r.categorySlug] = (map[r.categorySlug] ?? 0) + 1;
    return map;
  }, [reminders]);

  const filtered = useMemo(() => {
    if (!reminders) return [];
    return activeSlug === "all" ? reminders : reminders.filter((r) => r.categorySlug === activeSlug);
  }, [reminders, activeSlug]);

  const tabs = [{ slug: "all", label: "All" }, ...COMPLIANCE_ENTITIES.map((e) => ({ slug: e.slug, label: e.label }))];

  return (
    <div>
      <SectionHead title="Reminders" sub="Everything expired or expiring within the next 60 days, across your modules — soonest first" />

      {reminders !== null && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {tabs.map((t) => {
            const count = t.slug === "all" ? reminders.length : (counts[t.slug] ?? 0);
            const active = activeSlug === t.slug;
            return (
              <button
                key={t.slug}
                onClick={() => setActiveSlug(t.slug)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: active ? C.teal : "#fff",
                  color: active ? "#fff" : count === 0 ? C.faint : C.ink,
                  border: `1px solid ${active ? C.teal : C.border}`,
                }}
              >
                {t.label}
                {count > 0 && <span style={{ opacity: 0.8 }}> ({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      {reminders === null ? <Empty text="Loading…" /> : <ReminderList reminders={filtered} />}
    </div>
  );
}
