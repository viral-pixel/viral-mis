"use client";

import { buildMilanBillFromTextItems, type ParsedMilanBill, type PositionedTextItem } from "@/app/lib/milanBillCalibration";

// Runs entirely in the browser. Milan's "typed figures" PDFs embed full-
// resolution scans of the pre-printed slip, so the file itself is several
// MB — well over Vercel's ~4.5MB serverless function request-body limit.
// None of those scan bytes are actually needed (the parser only reads the
// small typed-text layer), so instead of uploading the whole PDF, we parse
// it here with pdfjs-dist and send only the tiny extracted result
// ({srNo, itemName, weight, rate, amount} per row) to the server for the
// vendor/item DB lookups. That keeps every upload small regardless of the
// original scan's size — this isn't a workaround for one big file, every
// bill of this type will be this size.
export async function extractMilanBillFromFile(file: File): Promise<ParsedMilanBill> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;

  const rawItems: PositionedTextItem[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (!("str" in item)) continue; // skip TextMarkedContent entries, which carry no text/position
      rawItems.push({ page: pageNumber, str: item.str, x: item.transform[4], y: item.transform[5] });
    }
  }
  return buildMilanBillFromTextItems(rawItems);
}
