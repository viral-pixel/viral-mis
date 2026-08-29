import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { COMPLIANCE_SUBMODULE_SLUG } from "../app/lib/complianceEntities";
import { PURCHASE_SUBMODULE_SLUG, PURCHASE_GROUPS, subItemsForGroup } from "../app/lib/purchaseGroups";
import { VEGETABLE_SUBMODULE_SLUG, VEGETABLE_ITEMS } from "../app/lib/vegetableItems";

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

  for (const group of PURCHASE_GROUPS) {
    const subItemsCsv = subItemsForGroup(group).join(",");
    await prisma.purchaseGroup.upsert({
      where: { name: group.name },
      update: { unit: group.unit, hasAmount: group.hasAmount, hasQuantity: group.hasQuantity, sortOrder: group.sortOrder, subItemsCsv },
      create: { name: group.name, unit: group.unit, hasAmount: group.hasAmount, hasQuantity: group.hasQuantity, sortOrder: group.sortOrder, subItemsCsv },
    });
  }

  await prisma.subModule.upsert({
    where: { slug: VEGETABLE_SUBMODULE_SLUG },
    update: {},
    create: {
      moduleId: ketanModule.id,
      name: "Vegetable & Produce Purchase",
      slug: VEGETABLE_SUBMODULE_SLUG,
    },
  });

  for (let i = 0; i < VEGETABLE_ITEMS.length; i++) {
    const srNo = i + 1;
    await prisma.vegetableItem.upsert({
      where: { srNo },
      update: { name: VEGETABLE_ITEMS[i] },
      create: { srNo, name: VEGETABLE_ITEMS[i] },
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
  console.log("Module:", ketanModule.name, "| SubModules:", COMPLIANCE_SUBMODULE_SLUG, PURCHASE_SUBMODULE_SLUG, VEGETABLE_SUBMODULE_SLUG);
  console.log(`Seeded ${PURCHASE_GROUPS.length} purchase costing groups.`);
  console.log(`Seeded ${VEGETABLE_ITEMS.length} vegetable/fruit master items.`);
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
