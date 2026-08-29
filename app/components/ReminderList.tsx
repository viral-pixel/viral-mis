"use client";

import Link from "next/link";
import { C } from "@/app/lib/constants";
import { EXPIRY_STATUS_LABEL, EXPIRY_STATUS_STYLE, type ExpiryReminder } from "@/app/lib/expiry";
import { Empty } from "@/app/components/ui";

export function ReminderList({ reminders, limit }: { reminders: ExpiryReminder[]; limit?: number }) {
  const list = limit ? reminders.slice(0, limit) : reminders;
  if (list.length === 0) return <Empty text="Nothing expiring soon — you're all caught up." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((r) => {
        const style = EXPIRY_STATUS_STYLE[r.status];
        return (
          <Link
            key={r.id}
            href={r.editHref}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 14px",
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${style.color}`,
              borderRadius: 8,
              textDecoration: "none",
              color: C.ink,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.recordLabel}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                {r.subModuleName} · {r.dateLabel}: {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: C.sub, whiteSpace: "nowrap" }}>
                {r.daysUntil < 0 ? `${Math.abs(r.daysUntil)}d overdue` : r.daysUntil === 0 ? "Today" : `in ${r.daysUntil}d`}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 5,
                  background: style.background,
                  color: style.color,
                  border: `1px solid ${style.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {EXPIRY_STATUS_LABEL[r.status]}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
