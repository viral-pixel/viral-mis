import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";
import { parseUploadedSheet, excelValueToDate, excelValueToNumber } from "@/app/lib/excelIO";

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Accepts this module's own export format (Date, Site, Meal Type, Category,
// Quantity, Remarks — one row per line item). Site/Meal Type/Category names
// are matched case-insensitively against the existing masters and
// auto-created if new, same convenience as the Vegetable module's importer,
// so re-uploading an edited export doesn't require pre-creating every name.
// Purely additive (like every other importer in this app) — a row that
// collides with an existing (date, site, meal, category) entry is reported
// as an error rather than silently overwritten; edit that entry directly
// in the Daily Entries grid instead.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const rows = await parseUploadedSheet(file);
  if (rows.length === 0) return NextResponse.json({ created: 0, errors: [] });

  const keys = Object.keys(rows[0]);
  const find = (label: string) => keys.find((k) => norm(k) === norm(label));
  const dateKey = find("Date"), siteKey = find("Site"), mealKey = find("Meal Type"), catKey = find("Category"), qtyKey = find("Quantity"), remarksKey = find("Remarks");
  if (!dateKey || !siteKey || !mealKey || !catKey || !qtyKey) {
    return NextResponse.json({ error: "Expected columns: Date, Site, Meal Type, Category, Quantity, Remarks" }, { status: 400 });
  }

  const [sites, mealTypes, categories] = await Promise.all([
    prisma.rotiSite.findMany(),
    prisma.rotiMealType.findMany(),
    prisma.rotiCategory.findMany(),
  ]);
  const siteByName = new Map(sites.map((s) => [norm(s.name), s]));
  const mealByName = new Map(mealTypes.map((m) => [norm(m.name), m]));
  const catByName = new Map(categories.map((c) => [norm(c.name), c]));
  let maxSiteSort = Math.max(0, ...sites.map((s) => s.sortOrder));
  let maxMealSort = Math.max(0, ...mealTypes.map((m) => m.sortOrder));
  let maxCatSort = Math.max(0, ...categories.map((c) => c.sortOrder));

  const enteredBy = auth.session.username ?? "";
  const dayCache = new Map<string, number>(); // date key -> RotiDayEntry id
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const date = excelValueToDate(row[dateKey]);
    const siteName = String(row[siteKey] ?? "").trim();
    const mealName = String(row[mealKey] ?? "").trim();
    const catName = String(row[catKey] ?? "").trim();
    const qty = excelValueToNumber(row[qtyKey]);
    if (!date || !siteName || !mealName || !catName) continue;
    if (qty == null || qty === 0) continue;

    let site = siteByName.get(norm(siteName));
    if (!site) {
      maxSiteSort += 1;
      site = await prisma.rotiSite.create({ data: { name: siteName, sortOrder: maxSiteSort } });
      siteByName.set(norm(siteName), site);
    }
    let mealType = mealByName.get(norm(mealName));
    if (!mealType) {
      maxMealSort += 1;
      mealType = await prisma.rotiMealType.create({ data: { name: mealName, sortOrder: maxMealSort } });
      mealByName.set(norm(mealName), mealType);
    }
    let category = catByName.get(norm(catName));
    if (!category) {
      maxCatSort += 1;
      category = await prisma.rotiCategory.create({ data: { name: catName, sortOrder: maxCatSort } });
      catByName.set(norm(catName), category);
    }

    const dateKeyStr = date.toISOString().slice(0, 10);
    const remarks = remarksKey ? String(row[remarksKey] ?? "").trim() : "";
    let dayEntryId = dayCache.get(dateKeyStr);
    if (dayEntryId == null) {
      const existing = await prisma.rotiDayEntry.findUnique({ where: { date } });
      const dayEntry = existing
        ? (remarks ? await prisma.rotiDayEntry.update({ where: { id: existing.id }, data: { remarks } }) : existing)
        : await prisma.rotiDayEntry.create({ data: { date, remarks, enteredBy } });
      dayEntryId = dayEntry.id;
      dayCache.set(dateKeyStr, dayEntryId);
    }

    try {
      await prisma.rotiLineItem.create({
        data: { dayEntryId, siteId: site.id, mealTypeId: mealType.id, categoryId: category.id, quantity: qty },
      });
      created++;
    } catch {
      errors.push(`Row ${i + 2}: an entry already exists for ${dateKeyStr} / ${site.name} / ${mealType.name} / ${category.name} — edit it directly instead`);
    }
  }

  return NextResponse.json({ created, errors });
}
