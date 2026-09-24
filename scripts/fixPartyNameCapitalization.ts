// One-off: title-case every existing RentParty.partyName (2026-09-24,
// user's request: "Make all party name first letter of the word capital").
// Going forward this is applied automatically on create/update — see
// app/lib/monthlyRentMeta.ts's toTitleCase, used in the parties API routes.
import { PrismaClient } from "@prisma/client";
import { toTitleCase } from "../app/lib/monthlyRentMeta";

const prisma = new PrismaClient();

async function main() {
  const parties = await prisma.rentParty.findMany({ select: { id: true, partyName: true } });
  let updated = 0;
  for (const p of parties) {
    const fixed = toTitleCase(p.partyName);
    if (fixed !== p.partyName) {
      await prisma.rentParty.update({ where: { id: p.id }, data: { partyName: fixed } });
      console.log(`${p.partyName}  ->  ${fixed}`);
      updated++;
    }
  }
  console.log(`Updated ${updated} of ${parties.length} party names.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
