// One-off backfill for the needsReminder field added 2026-08-29. Existing
// imported records default to needsReminder=true (the Prisma default), so
// this sets it false wherever the record's own status field already reads
// as closed — per user request: closed sites with expired insurance/
// licenses shouldn't clutter the reminders feed. Safe to re-run; it's
// idempotent (just re-derives the same value from current data each time).
import { PrismaClient } from "@prisma/client";
import { COMPLIANCE_ENTITIES, isRecordClosed } from "../app/lib/complianceEntities";

const prisma = new PrismaClient();

async function main() {
  for (const entity of COMPLIANCE_ENTITIES) {
    if (!entity.closedStatusField) continue;
    const model = (prisma as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]>; update: (args: unknown) => Promise<unknown> }>)[entity.model];
    const rows = await model.findMany();
    let changed = 0;
    for (const row of rows) {
      const statusValue = row[entity.closedStatusField.key];
      const shouldNeedReminder = !isRecordClosed(entity, statusValue);
      if (row.needsReminder !== shouldNeedReminder) {
        await model.update({ where: { id: row.id }, data: { needsReminder: shouldNeedReminder } });
        changed++;
      }
    }
    console.log(`${entity.label}: ${changed} of ${rows.length} updated`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
