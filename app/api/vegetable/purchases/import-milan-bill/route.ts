import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";
import { parseMilanBillPdf } from "@/app/lib/milanBillParser";

// Milan Vegetable Co.'s pre-printed slip has no text layer of its own, but
// the "typed figures" variant (Weight/Rate/Amount typed in as real PDF
// text over the pre-printed grid) can be read deterministically from those
// typed numbers' positions — no AI, no external API call, no per-bill
// cost. See milanBillParser.ts for how. Returns a DRAFT only; nothing is
// written to the database here. Date and vendor aren't in the typed data
// (only the three figure columns are), so the client's review form starts
// with today's date and the Jakir vendor preset — Ketan/Kiran corrects
// those and reviews every line before Save All.
export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseMilanBillPdf(buf);
  } catch {
    return NextResponse.json({ error: "Could not read this PDF" }, { status: 400 });
  }

  if (parsed.items.length === 0) {
    return NextResponse.json({
      error: "No typed figures found in this PDF. This reader only works with the \"typed figures\" version of the bill — Weight/Rate/Amount entered as PDF text, not just handwritten on a scan.",
    }, { status: 422 });
  }

  const vendor = await prisma.vegetableVendor.findFirst({ where: { name: { equals: "Jakir", mode: "insensitive" } } });
  const dbItems = await prisma.vegetableItem.findMany();
  const itemByName = new Map(dbItems.map((i) => [i.name, i]));

  const lines = parsed.items.map((it) => {
    const dbItem = itemByName.get(it.itemName);
    return {
      particulars: it.itemName,
      quantity: it.weight,
      rate: it.rate,
      amount: it.amount,
      itemId: dbItem?.id ?? null,
      itemName: dbItem?.name ?? it.itemName,
    };
  });

  const sumOfLines = lines.reduce((s, l) => s + l.amount, 0);

  return NextResponse.json({
    date: null, // not present in the typed data — client defaults to today, reviewer corrects it
    invoiceNo: null,
    vendorId: vendor?.id ?? null,
    vendorName: vendor?.name ?? "Jakir",
    printedTotal: null, // Milan's slip has no printed grand total to cross-check against
    sumOfLines,
    totalMismatch: false,
    lines,
    unmatchedCount: lines.filter((l) => l.itemId == null).length,
    skippedCount: parsed.skippedCount,
  });
}
