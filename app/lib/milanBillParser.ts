import { VEGETABLE_ITEMS } from "@/app/lib/vegetableItems";

// Milan Vegetable Co. issues a pre-printed order slip: Sr. No. and item
// name are printed (in the same fixed order as VEGETABLE_ITEMS), and their
// staff fills in Weight / Rate / Amount by hand for whatever was supplied
// that day. A plain scan of that slip has no text layer at all — nothing
// to extract deterministically (see ambeBillParser.ts's doc comment for
// the contrast with Ambe's real GST invoices).
//
// This parser only works on the "typed figures" variant: the same slip,
// but with the handwritten Weight/Rate/Amount numbers also typed into the
// PDF as real text objects positioned over the pre-printed grid — nothing
// else is typed (no item names, no date, no site name). Because the grid
// is pre-printed and fixed, those typed numbers' (x, y) positions turn out
// to be exact, uniform arithmetic functions of the row's Sr. No. — so
// which vegetable a typed figure belongs to is not a guess, it's a
// calculation. No AI, no OCR, no per-bill cost.
//
// Calibration below was solved (linear regression) from 10 real populated
// rows on a real 2-page bill, every one cross-checked by eye against the
// scanned image — see the "Two failure modes" conversation history for the
// verification table (Sr 1/8/13/18/20/27 on page 1, Sr 44/57/60/70 on page
// 2, row pitch ~16pt on both pages). If Milan ever reprints the slip with
// different margins/spacing, this calibration will need to be redone
// against a fresh sample the same way.
const PAGE_CALIBRATION: Record<number, { intercept: number; slope: number; minSr: number; maxSr: number }> = {
  1: { intercept: 544.79, slope: 15.974, minSr: 1, maxSr: 38 },
  2: { intercept: 1154.7, slope: 16.194, minSr: 39, maxSr: 70 },
};

// Column x-bands (points) — Weight / Rate(per 20kg) / Amount typed text
// clusters tightly within these ranges with a wide, safe gap between them.
const COL_WEIGHT_MAX_X = 310;
const COL_RATE_MAX_X = 410;

function srNoFromPosition(page: number, y: number): number | null {
  const cal = PAGE_CALIBRATION[page];
  if (!cal) return null;
  const raw = (cal.intercept - y) / cal.slope;
  const sr = Math.round(raw);
  // Reject anything that doesn't land close to a whole row, or falls
  // outside this page's known Sr. No. range — flag as unparsed rather
  // than silently attributing a figure to the wrong vegetable.
  if (Math.abs(raw - sr) > 0.35) return null;
  if (sr < cal.minSr || sr > cal.maxSr) return null;
  return sr;
}

function parseNum(s: string): number | null {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

interface PositionedTextItem {
  page: number;
  str: string;
  x: number;
  y: number;
}

export interface ParsedMilanItem {
  srNo: number;
  itemName: string; // always resolved — Sr. No. IS the VEGETABLE_ITEMS index
  weight: number;
  rate: number;
  amount: number;
}

export interface ParsedMilanBill {
  items: ParsedMilanItem[];
  // Typed numbers we found but couldn't confidently place into a row/column
  // (unexpected grouping, off-calibration position, non-numeric text). Kept
  // as a count so a bad read is surfaced, never silently dropped.
  skippedCount: number;
}

// pdf-parse's plain .text is a flat string with no coordinates — useless
// here. Its `pagerender` option hands back the underlying pdf.js page,
// whose getTextContent() gives each text run's (x, y) via `transform`.
export async function parseMilanBillPdf(buf: Buffer): Promise<ParsedMilanBill> {
  const pdfParse = (await import("pdf-parse")).default;
  const rawItems: PositionedTextItem[] = [];

  await pdfParse(buf, {
    pagerender: (pageData) =>
      pageData.getTextContent().then((textContent) => {
        for (const item of textContent.items) {
          const str = item.str.trim();
          if (!str) continue;
          rawItems.push({ page: pageData.pageNumber, str, x: item.transform[4], y: item.transform[5] });
        }
        return "";
      }),
  });

  // Group same-row figures: same page, same y (rounded — pdf.js sometimes
  // emits sub-pixel jitter between text runs typed at the "same" spot).
  const rowGroups = new Map<string, PositionedTextItem[]>();
  for (const it of rawItems) {
    const key = `${it.page}:${Math.round(it.y)}`;
    const group = rowGroups.get(key);
    if (group) group.push(it);
    else rowGroups.set(key, [it]);
  }

  const items: ParsedMilanItem[] = [];
  let skippedCount = 0;

  for (const group of rowGroups.values()) {
    if (group.length !== 3) { skippedCount += group.length; continue; }

    const [weightItem, rateItem, amountItem] = [...group].sort((a, b) => a.x - b.x);
    const inWeightCol = weightItem.x < COL_WEIGHT_MAX_X;
    const inRateCol = rateItem.x >= COL_WEIGHT_MAX_X && rateItem.x < COL_RATE_MAX_X;
    const inAmountCol = amountItem.x >= COL_RATE_MAX_X;
    if (!inWeightCol || !inRateCol || !inAmountCol) { skippedCount += 3; continue; }

    const weight = parseNum(weightItem.str);
    const rate = parseNum(rateItem.str);
    const amount = parseNum(amountItem.str);
    if (weight == null || rate == null || amount == null) { skippedCount += 3; continue; }

    const srNo = srNoFromPosition(weightItem.page, weightItem.y);
    if (srNo == null) { skippedCount += 3; continue; }

    items.push({ srNo, itemName: VEGETABLE_ITEMS[srNo - 1], weight, rate, amount });
  }

  items.sort((a, b) => a.srNo - b.srNo);
  return { items, skippedCount };
}
