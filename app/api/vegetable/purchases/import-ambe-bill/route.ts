import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";
import { parseAmbeBillText } from "@/app/lib/ambeBillParser";

// Ambe issues real GST tax invoices (text-layer PDFs), so this reads and
// maps the bill deterministically — no AI, no external API call. Returns a
// DRAFT only; nothing is written to the database here. The client opens
// this draft in the same batch entry grid used for manual entry, so Ketan
// reviews every line (and fixes any unmatched item) before anything saves.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buf);
    text = data.text;
  } catch {
    return NextResponse.json({ error: "Could not read this PDF" }, { status: 400 });
  }

  const parsed = parseAmbeBillText(text);
  if (parsed.items.length === 0) {
    return NextResponse.json({ error: "No line items recognized in this PDF — it may not be an Ambe Enterprise invoice, or the layout has changed." }, { status: 422 });
  }

  const vendor = await prisma.vegetableVendor.findFirst({ where: { name: { equals: "Ambe Enterprise", mode: "insensitive" } } });
  const dbItems = await prisma.vegetableItem.findMany();
  const itemByName = new Map(dbItems.map((i) => [i.name, i]));

  const lines = parsed.items.map((it) => {
    const dbItem = it.matchedItem ? itemByName.get(it.matchedItem) : undefined;
    return {
      particulars: it.particulars,
      quantity: it.qty,
      rate: it.rate,
      amount: it.amount,
      itemId: dbItem?.id ?? null,
      itemName: dbItem?.name ?? null,
    };
  });

  const sumOfLines = lines.reduce((s, l) => s + l.amount, 0);
  const totalMismatch = parsed.printedTotal != null && Math.abs(sumOfLines - parsed.printedTotal) > 1;

  return NextResponse.json({
    date: parsed.date,
    invoiceNo: parsed.invoiceNo,
    vendorId: vendor?.id ?? null,
    vendorName: vendor?.name ?? "Ambe Enterprise",
    printedTotal: parsed.printedTotal,
    sumOfLines,
    totalMismatch,
    lines,
    unmatchedCount: lines.filter((l) => l.itemId == null).length,
  });
}
