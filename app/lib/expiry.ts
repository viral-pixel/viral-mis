// Shared expiry-status logic. A record's Active/Expiring Soon/Expired state
// is always computed live from its date vs. today, never stored — so it's
// correct the moment you open the dashboard, not just as of last edit.

export type ExpiryStatus = "expired" | "expiring_soon" | "active" | "no_date";

export const EXPIRING_SOON_WINDOW_DAYS = 60;

export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(date: Date | null | undefined): ExpiryStatus {
  if (!date) return "no_date";
  const days = daysUntil(date);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_WINDOW_DAYS) return "expiring_soon";
  return "active";
}

export const EXPIRY_STATUS_LABEL: Record<ExpiryStatus, string> = {
  expired: "Expired",
  expiring_soon: "Expiring Soon",
  active: "Active",
  no_date: "No Date",
};

// Inline-style tokens per status (this app uses inline styles + the C
// palette throughout, not Tailwind utility classes) — used consistently
// across every module's dashboard and table badges so color always means
// the same thing.
export const EXPIRY_STATUS_STYLE: Record<ExpiryStatus, { background: string; color: string; border: string }> = {
  expired: { background: "#FBE9E7", color: "#B3423A", border: "#B3423A33" },
  expiring_soon: { background: "#FBF0DD", color: "#B9770E", border: "#B9770E33" },
  active: { background: "#E4F0EC", color: "#1F6F63", border: "#1F6F6333" },
  no_date: { background: "#F1F0EA", color: "#9A9D93", border: "#E2DFD5" },
};

// One row of an expiry reminder feed — built by each sub-module's
// "collect reminders" function and merged for the dashboards.
export interface ExpiryReminder {
  id: string; // unique across the whole feed, e.g. "vehicle-14-insurance"
  moduleName: string;
  subModuleName: string;
  categoryLabel: string; // e.g. "PO & Agreement & Service Order" — for grouping/tabs
  categorySlug: string; // e.g. "agreements"
  recordLabel: string; // e.g. "Lumax Industries Ltd — FSSAI"
  dateLabel: string; // e.g. "Insurance End"
  date: Date;
  status: ExpiryStatus;
  daysUntil: number;
  editHref: string;
}

export function sortReminders(reminders: ExpiryReminder[]): ExpiryReminder[] {
  return [...reminders].sort((a, b) => a.daysUntil - b.daysUntil);
}
