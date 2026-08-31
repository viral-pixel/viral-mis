import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";
import { buildXlsxResponseBuffer, xlsxDownloadHeaders } from "@/app/lib/excelIO";

// One row per (date, site, meal, category) line item — same flat,
// one-fact-per-row shape every other module in this app exports, so it
// round-trips cleanly through /api/roti/import. Optional ?from=&to=
// (YYYY-MM-DD) narrows to a date range; omitted means everything.
export async function GET(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ROTI_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const days = await prisma.rotiDayEntry.findMany({
    where,
    include: {
      lines: { include: { site: true, mealType: true, category: true } },
    },
    orderBy: { date: "asc" },
  });

  const rows: (string | number)[][] = [];
  for (const day of days) {
    const dateStr = day.date.toISOString().slice(0, 10);
    const sorted = day.lines.slice().sort((a, b) =>
      a.site.sortOrder - b.site.sortOrder || a.mealType.sortOrder - b.mealType.sortOrder || a.category.sortOrder - b.category.sortOrder
    );
    for (const line of sorted) {
      rows.push([dateStr, line.site.name, line.mealType.name, line.category.name, line.quantity, day.remarks]);
    }
  }

  const headers = ["Date", "Site", "Meal Type", "Category", "Quantity", "Remarks"];
  const filename = from || to ? `roti-meal-count_${from || "start"}_to_${to || "end"}.xlsx` : "roti-meal-count.xlsx";
  const buffer = buildXlsxResponseBuffer("Roti Meal Count", headers, rows);
  return new NextResponse(new Uint8Array(buffer), { headers: xlsxDownloadHeaders(filename) });
}
