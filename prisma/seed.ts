import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { COMPLIANCE_SUBMODULE_SLUG } from "../app/lib/complianceEntities";
import { PURCHASE_SUBMODULE_SLUG, PURCHASE_ITEMS } from "../app/lib/purchaseItems";

const prisma = new PrismaClient();

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function main() {
  const ketanModule = await prisma.module.upsert({
    where: { name: "Ketan Reports" },
    update: {},
    create: { name: "Ketan Reports" },
  });

  await prisma.subModule.upsert({
    where: { slug: COMPLIANCE_SUBMODULE_SLUG },
    update: {},
    create: {
      moduleId: ketanModule.id,
      name: "Agreements, Licenses & Insurance",
      slug: COMPLIANCE_SUBMODULE_SLUG,
    },
  });

  await prisma.subModule.upsert({
    where: { slug: PURCHASE_SUBMODULE_SLUG },
    update: {},
    create: {
      moduleId: ketanModule.id,
      name: "Purchase & Consumption Costing",
      slug: PURCHASE_SUBMODULE_SLUG,
    },
  });

  for (const item of PURCHASE_ITEMS) {
    await prisma.purchaseItemCategory.upsert({
      where: { name: item.name },
      update: { unit: item.unit, hasAmount: item.hasAmount, hasQuantity: item.hasQuantity, sortOrder: item.sortOrder },
      create: { name: item.name, unit: item.unit, hasAmount: item.hasAmount, hasQuantity: item.hasQuantity, sortOrder: item.sortOrder },
    });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });
  const adminPassword = existingAdmin ? null : randomPassword();
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "Admin",
      isAdmin: true,
      passwordHash: await bcrypt.hash(adminPassword ?? "", 10),
    },
  });

  const existingKetan = await prisma.user.findUnique({ where: { username: "ketan" } });
  const ketanPassword = existingKetan ? null : randomPassword();
  const ketanUser = await prisma.user.upsert({
    where: { username: "ketan" },
    update: {},
    create: {
      username: "ketan",
      displayName: "Ketan",
      isAdmin: false,
      passwordHash: await bcrypt.hash(ketanPassword ?? "", 10),
    },
  });

  await prisma.userModuleAccess.upsert({
    where: { userId_moduleId: { userId: ketanUser.id, moduleId: ketanModule.id } },
    update: {},
    create: { userId: ketanUser.id, moduleId: ketanModule.id },
  });

  console.log("Seed complete.");
  console.log("Module:", ketanModule.name, "| SubModules:", COMPLIANCE_SUBMODULE_SLUG, PURCHASE_SUBMODULE_SLUG);
  console.log(`Seeded ${PURCHASE_ITEMS.length} purchase item categories.`);
  if (adminPassword) console.log(`New admin login -> username: admin  password: ${adminPassword}`);
  else console.log("admin user already existed, password unchanged");
  if (ketanPassword) console.log(`New ketan login -> username: ketan  password: ${ketanPassword}`);
  else console.log("ketan user already existed, password unchanged");
  console.log(`admin id=${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
