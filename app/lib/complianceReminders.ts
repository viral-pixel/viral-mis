import { prisma } from "@/app/lib/prisma";
import { COMPLIANCE_ENTITIES, entityRowTitle } from "@/app/lib/complianceEntities";
import { daysUntil, getExpiryStatus, sortReminders, type ExpiryReminder, type ExpiryStatus } from "@/app/lib/expiry";

const MODULE_NAME = "Ketan Reports";
const SUBMODULE_NAME = "Agreements, Licenses & Insurance";

export async function collectComplianceReminders(): Promise<ExpiryReminder[]> {
  const reminders: ExpiryReminder[] = [];
  for (const entity of COMPLIANCE_ENTITIES) {
    const model = (prisma as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]> }>)[entity.model];
    const rows = await model.findMany();
    for (const row of rows) {
      for (const ef of entity.expiryFields) {
        const raw = row[ef.key];
        if (!raw) continue;
        const date = new Date(raw as string);
        const status = getExpiryStatus(date);
        if (status === "active" || status === "no_date") continue;
        reminders.push({
          id: `${entity.slug}-${row.id}-${ef.key}`,
          moduleName: MODULE_NAME,
          subModuleName: SUBMODULE_NAME,
          recordLabel: `${entity.label}: ${entityRowTitle(entity, row)}`,
          dateLabel: ef.label,
          date,
          status,
          daysUntil: daysUntil(date),
          editHref: `/compliance/${entity.slug}`,
        });
      }
    }
  }
  return sortReminders(reminders);
}

export interface EntityCount {
  label: string;
  slug: string;
  count: number;
}

export interface MonthlyExpiryCount {
  monthLabel: string; // "Sep 2026"
  count: number;
}

export interface ComplianceStats {
  totalRecords: number;
  statusBreakdown: Record<ExpiryStatus, number>;
  recordsByEntity: EntityCount[];
  upcomingExpiriesByMonth: MonthlyExpiryCount[];
}

export async function collectComplianceStats(): Promise<ComplianceStats> {
  const statusBreakdown: Record<ExpiryStatus, number> = { expired: 0, expiring_soon: 0, active: 0, no_date: 0 };
  const recordsByEntity: EntityCount[] = [];
  const monthBuckets = new Map<string, number>(); // key: "YYYY-MM"
  let totalRecords = 0;

  for (const entity of COMPLIANCE_ENTITIES) {
    const model = (prisma as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]> }>)[entity.model];
    const rows = await model.findMany();
    totalRecords += rows.length;
    recordsByEntity.push({ label: entity.label, slug: entity.slug, count: rows.length });

    for (const row of rows) {
      for (const ef of entity.expiryFields) {
        const raw = row[ef.key];
        const date = raw ? new Date(raw as string) : null;
        const status = getExpiryStatus(date);
        statusBreakdown[status]++;
        if (date && (status === "expiring_soon" || status === "expired")) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const upcomingExpiriesByMonth: MonthlyExpiryCount[] = [...monthBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [y, m] = key.split("-");
      return { monthLabel: `${monthNames[Number(m) - 1]} ${y}`, count };
    });

  return { totalRecords, statusBreakdown, recordsByEntity, upcomingExpiriesByMonth };
}
