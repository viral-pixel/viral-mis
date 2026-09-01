import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";
import { parseUploadedWorkbook, excelValueToDate, excelValueToNumber } from "@/app/lib/excelIO";

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Accepts this module's own export format (3 sheets: Vegetable Purchases,
// Potato Onion Garlic, Cash Purchases). Items/vendors are matched by name;
// unknown item/vendor names are auto-created (same convenience as the
// Asset Management tool's bulk import) so re-uploading an edited export
// doesn't require pre-creating every name first.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const sheets = await parseUploadedWorkbook(file);
  const importBatch = `import-vegetable-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const enteredBy = auth.session.username ?? "";
  let created = 0;
  const errors: string[] = [];

  const purchaseRows = sheets["Vegetable Purchases"] ?? [];
  if (purchaseRows.length > 0) {
    const items = await prisma.vegetableItem.findMany();
    const vendors = await prisma.vegetableVendor.findMany();
    const itemByName = new Map(items.map((i) => [norm(i.name), i]));
    const vendorByName = new Map(vendors.map((v) => [norm(v.name), v]));
    let maxSrNo = Math.max(0, ...items.map((i) => i.srNo));

    const keys = Object.keys(purchaseRows[0]);
    const find = (label: string) => keys.find((k) => norm(k) === norm(label));
    const dateKey = find("Date"), itemKey = find("Item"), vendorKey = find("Vendor"), qtyKey = find("Quantity"), rateKey = find("Rate"), remarksKey = find("Remarks");

    for (let i = 0; i < purchaseRows.length; i++) {
      const row = purchaseRows[i];
      const date = dateKey ? excelValueToDate(row[dateKey]) : null;
      const itemName = itemKey ? String(row[itemKey] ?? "").trim() : "";
      const vendorName = vendorKey ? String(row[vendorKey] ?? "").trim() : "";
      if (!date || !itemName || !vendorName) continue;

      let item = itemByName.get(norm(itemName));
      if (!item) {
        maxSrNo += 1;
        item = await prisma.vegetableItem.create({ data: { name: itemName, srNo: maxSrNo } });
        itemByName.set(norm(itemName), item);
      }
      let vendor = vendorByName.get(norm(vendorName));
      if (!vendor) {
        vendor = await prisma.vegetableVendor.create({ data: { name: vendorName } });
        vendorByName.set(norm(vendorName), vendor);
      }

      const qty = qtyKey ? excelValueToNumber(row[qtyKey]) : null;
      const rate = rateKey ? excelValueToNumber(row[rateKey]) : null;
      if (qty == null || rate == null) { errors.push(`Vegetable Purchases row ${i + 2}: missing Quantity or Rate`); continue; }

      try {
        await prisma.vegetablePurchaseEntry.create({
          data: { date, itemId: item.id, vendorId: vendor.id, quantity: qty, rate, amount: qty * rate, remarks: remarksKey ? String(row[remarksKey] ?? "").trim() : "", enteredBy, importBatch },
        });
        created++;
      } catch (e) {
        errors.push(`Vegetable Purchases row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  }

  const poRows = sheets["Potato Onion Garlic"] ?? [];
  if (poRows.length > 0) {
    const vendors = await prisma.vegetableVendor.findMany();
    const vendorByName = new Map(vendors.map((v) => [norm(v.name), v]));
    const keys = Object.keys(poRows[0]);
    const find = (label: string) => keys.find((k) => norm(k) === norm(label));
    const billNoKey = find("Bill No"), billDateKey = find("Bill Date"), receivedKey = find("Material Received Date");
    const vendorKey = find("Vendor"), sourceKey = find("Source"), itemKey = find("Item");
    const qtyKey = find("Quantity"), rateKey = find("Rate"), stockKey = find("Closing Stock Note");

    for (let i = 0; i < poRows.length; i++) {
      const row = poRows[i];
      const billDate = billDateKey ? excelValueToDate(row[billDateKey]) : null;
      const itemName = itemKey ? String(row[itemKey] ?? "").trim() : "";
      if (!billDate || !itemName) continue;

      let vendorId: number | null = null;
      const vendorName = vendorKey ? String(row[vendorKey] ?? "").trim() : "";
      if (vendorName) {
        let vendor = vendorByName.get(norm(vendorName));
        if (!vendor) {
          vendor = await prisma.vegetableVendor.create({ data: { name: vendorName } });
          vendorByName.set(norm(vendorName), vendor);
        }
        vendorId = vendor.id;
      }

      const qty = qtyKey ? excelValueToNumber(row[qtyKey]) : null;
      const rate = rateKey ? excelValueToNumber(row[rateKey]) : null;

      try {
        await prisma.potatoOnionEntry.create({
          data: {
            billNo: billNoKey ? String(row[billNoKey] ?? "").trim() : "",
            billDate,
            materialReceivedDate: receivedKey ? String(row[receivedKey] ?? "").trim() : "",
            vendorId,
            source: sourceKey ? String(row[sourceKey] ?? "").trim() : "",
            item: itemName,
            quantity: qty,
            rate,
            amount: qty != null && rate != null ? qty * rate : null,
            closingStockNote: stockKey ? String(row[stockKey] ?? "").trim() : "",
            enteredBy, importBatch,
          },
        });
        created++;
      } catch (e) {
        errors.push(`Potato Onion Garlic row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  }

  const cashRows = sheets["Cash Purchases"] ?? [];
  if (cashRows.length > 0) {
    const keys = Object.keys(cashRows[0]);
    const find = (label: string) => keys.find((k) => norm(k) === norm(label));
    const dateKey = find("Date"), categoryKey = find("Category"), amountKey = find("Amount"), remarksKey = find("Remarks");

    for (let i = 0; i < cashRows.length; i++) {
      const row = cashRows[i];
      const date = dateKey ? excelValueToDate(row[dateKey]) : null;
      const category = categoryKey ? String(row[categoryKey] ?? "").trim() : "";
      const amount = amountKey ? excelValueToNumber(row[amountKey]) : null;
      if (!date || !category || amount == null) continue;

      try {
        await prisma.cashPurchaseEntry.create({
          data: { date, category, amount, remarks: remarksKey ? String(row[remarksKey] ?? "").trim() : "", enteredBy, importBatch },
        });
        created++;
      } catch (e) {
        errors.push(`Cash Purchases row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  }

  return NextResponse.json({ created, errors });
}
