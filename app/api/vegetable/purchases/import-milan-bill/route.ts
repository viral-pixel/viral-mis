import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";

// Milan Vegetable Co.'s pre-printed slip has no text layer of its own, but
// the "typed figures" variant (Weight/Rate/Amount typed in as real PDF
// text over the pre-printed grid) can be read deterministically from those
// typed numbers' positions — no AI, no external API call, no per-bill
// cost. See milanBillCalibration.ts for the row/column math.
//
// The PDF itself is NOT uploaded here — it embeds full-resolution scans of
// the slip, several MB, well past Vercel's ~4.5MB serverless function
// request-body limit (confirmed the hard way: a real bill 413'd in
// production). None of those scan bytes matter to the parser, so the file
// is parsed client-side with pdfjs-dist (see milanBillClientExtract.ts)
// and only the small extracted {srNo, itemName, weight, rate, amount} list
// is posted here — this route just does the vendor/item DB lookups and
// returns a DRAFT; nothing is written to the database. Date and vendor
// aren't in the typed data (only the three figure columns are), so the
// client's review form starts with today's date and the Jakir vendor
// preset — Ketan/Kiran corrects those and reviews every line before Save
// All.
interface MilanBillItemInput { srNo: number; itemName: string; weight: number; rate: number; amount: number }

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(VEGETABLE_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { items?: MilanBillItemInput[]; skippedCount?: number } | null;
  const parsedItems = body?.items;
  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return NextResponse.json({ error: "No line items to import." }, { status: 400 });
  }

  const vendor = await prisma.vegetableVendor.findFirst({ where: { name: { equals: "Jakir", mode: "insensitive" } } });
  const dbItems = await prisma.vegetableItem.findMany();
  const itemByName = new Map(dbItems.map((i) => [i.name, i]));

  const lines = parsedItems.map((it) => {
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
    skippedCount: body?.skippedCount ?? 0,
  });
}
