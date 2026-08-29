"use client";

import { useEffect, useState } from "react";
import { SectionHead, Empty } from "@/app/components/ui";
import { ReminderList } from "@/app/components/ReminderList";
import type { ExpiryReminder } from "@/app/lib/expiry";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ExpiryReminder[] | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setReminders(d.reminders ?? []))
      .catch(() => setReminders([]));
  }, []);

  return (
    <div>
      <SectionHead title="Reminders" sub="Everything expired or expiring within the next 60 days, across your modules — soonest first" />
      {reminders === null ? <Empty text="Loading…" /> : <ReminderList reminders={reminders} />}
    </div>
  );
}
