import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { COMPLIANCE_SUBMODULE_SLUG } from "../app/lib/complianceEntities";
import { PURCHASE_SUBMODULE_SLUG, PURCHASE_GROUPS, subItemsForGroup } from "../app/lib/purchaseGroups";
import { VEGETABLE_SUBMODULE_SLUG, VEGETABLE_ITEMS } from "../app/lib/vegetableItems";
import { ROTI_SUBMODULE_SLUG, ROTI_DEFAULT_SITES, ROTI_DEFAULT_MEAL_TYPES, ROTI_DEFAULT_CATEGORIES } from "../app/lib/rotiMeta";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "../app/lib/vendorPaymentMeta";

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

  const kiranModule = await prisma.module.upsert({
    where: { name: "Kiran Reports" },
    update: {},
    create: { name: "Kiran Reports" },
  });

  await prisma.subModule.upsert({
    where: { slug: ROTI_SUBMODULE_SLUG },
    update: {},
    create: {
      moduleId: kiranModule.id,
      name: "Roti / Meal Count",
      slug: ROTI_SUBMODULE_SLUG,
    },
  });

  for (let i = 0; i < ROTI_DEFAULT_SITES.length; i++) {
    await prisma.rotiSite.upsert({
      where: { name: ROTI_DEFAULT_SITES[i] },
      update: {},
      create: { name: ROTI_DEFAULT_SITES[i], sortOrder: i },
    });
  }
  for (let i = 0; i < ROTI_DEFAULT_MEAL_TYPES.length; i++) {
    await prisma.rotiMealType.upsert({
      where: { name: ROTI_DEFAULT_MEAL_TYPES[i] },
      update: {},
      create: { name: ROTI_DEFAULT_MEAL_TYPES[i], sortOrder: i },
    });
  }
  for (let i = 0; i < ROTI_DEFAULT_CATEGORIES.length; i++) {
    await prisma.rotiCategory.upsert({
      where: { name: ROTI_DEFAULT_CATEGORIES[i] },
      update: {},
      create: { name: ROTI_DEFAULT_CATEGORIES[i], sortOrder: i },
    });
  }

  const sandipModule = await prisma.module.upsert({
    where: { name: "Sandip Reports" },
    update: {},
    create: { name: "Sandip Reports" },
  });

  await prisma.subModule.upsert({
    where: { slug: VENDOR_PAYMENT_SUBMODULE_SLUG },
    update: {},
    create: {
      moduleId: sandipModule.id,
      name: "Vendor Payment",
      slug: VENDOR_PAYMENT_SUBMODULE_SLUG,
    },
  });

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

  const existingKiran = await prisma.user.findUnique({ where: { username: "kiran" } });
  const kiranPassword = existingKiran ? null : randomPassword();
  const kiranUser = await prisma.user.upsert({
    where: { username: "kiran" },
    update: {},
    create: {
      username: "kiran",
      displayName: "Kiran Parmar",
      isAdmin: false,
      passwordHash: await bcrypt.hash(kiranPassword ?? "", 10),
    },
  });

  await prisma.userModuleAccess.upsert({
    where: { userId_moduleId: { userId: kiranUser.id, moduleId: kiranModule.id } },
    update: {},
    create: { userId: kiranUser.id, moduleId: kiranModule.id },
  });

  const existingSandip = await prisma.user.findUnique({ where: { username: "sandip" } });
  const sandipPassword = existingSandip ? null : randomPassword();
  const sandipUser = await prisma.user.upsert({
    where: { username: "sandip" },
    update: {},
    create: {
      username: "sandip",
      displayName: "Sandip Prajapati",
      isAdmin: false,
      passwordHash: await bcrypt.hash(sandipPassword ?? "", 10),
    },
  });

  await prisma.userModuleAccess.upsert({
    where: { userId_moduleId: { userId: sandipUser.id, moduleId: sandipModule.id } },
    update: {},
    create: { userId: sandipUser.id, moduleId: sandipModule.id },
  });

  // Rajiv (business partner): every module EXCEPT Sandip Reports (Vendor
  // Payment + its report). Not an admin, so no Users & Access / Modules /
  // admin-only pages; he can change his own password from Settings.
  const existingRajiv = await prisma.user.findUnique({ where: { username: "rajiv" } });
  const rajivPassword = existingRajiv ? null : randomPassword();
  const rajivUser = await prisma.user.upsert({
    where: { username: "rajiv" },
    update: {},
    create: {
      username: "rajiv",
      displayName: "Rajiv",
      isAdmin: false,
      passwordHash: await bcrypt.hash(rajivPassword ?? "", 10),
    },
  });

  for (const moduleId of [ketanModule.id, kiranModule.id]) {
    await prisma.userModuleAccess.upsert({
      where: { userId_moduleId: { userId: rajivUser.id, moduleId } },
      update: {},
      create: { userId: rajivUser.id, moduleId },
    });
  }

  console.log("Seed complete.");
  console.log("Module:", ketanModule.name, "| SubModules:", COMPLIANCE_SUBMODULE_SLUG, PURCHASE_SUBMODULE_SLUG, VEGETABLE_SUBMODULE_SLUG);
  console.log("Module:", kiranModule.name, "| SubModules:", ROTI_SUBMODULE_SLUG);
  console.log("Module:", sandipModule.name, "| SubModules:", VENDOR_PAYMENT_SUBMODULE_SLUG);
  console.log(`Seeded ${PURCHASE_GROUPS.length} purchase costing groups.`);
  console.log(`Seeded ${VEGETABLE_ITEMS.length} vegetable/fruit master items.`);
  console.log(`Seeded ${ROTI_DEFAULT_SITES.length} roti sites, ${ROTI_DEFAULT_MEAL_TYPES.length} meal types, ${ROTI_DEFAULT_CATEGORIES.length} categories.`);
  if (adminPassword) console.log(`New admin login -> username: admin  password: ${adminPassword}`);
  else console.log("admin user already existed, password unchanged");
  if (ketanPassword) console.log(`New ketan login -> username: ketan  password: ${ketanPassword}`);
  else console.log("ketan user already existed, password unchanged");
  if (kiranPassword) console.log(`New kiran login -> username: kiran  password: ${kiranPassword}`);
  else console.log("kiran user already existed, password unchanged");
  if (sandipPassword) console.log(`New sandip login -> username: sandip  password: ${sandipPassword}`);
  else console.log("sandip user already existed, password unchanged");
  if (rajivPassword) console.log(`New rajiv login -> username: rajiv  password: ${rajivPassword}`);
  else console.log("rajiv user already existed, password unchanged");
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
