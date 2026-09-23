import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug, requireModuleReadAccess } from "@/app/lib/authz";
import { ALKESH_SUBMODULE_SLUG } from "@/app/lib/alkeshMeta";

export async function GET(req: NextRequest) {
  const auth = await requireModuleReadAccess(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(`${from}-01`) } : {}),
      ...(to ? { lte: new Date(new Date(`${to}-01`).getFullYear(), new Date(`${to}-01`).getMonth() + 1, 0) } : {}),
    };
  }

  const entries = await prisma.alkeshMilkEntry.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }], take: 500 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireModuleAccessBySubModuleSlug(ALKESH_SUBMODULE_SLUG);
  if (!auth.ok) return auth.response;

  const { date, site, milkTeaQty, milkPantryQty, curdQty, buttermilkQty, remarks } = await req.json();
  if (!date || !site) {
    return NextResponse.json({ error: "Date and Site are required" }, { status: 400 });
  }
  const vals = [milkTeaQty, milkPantryQty, curdQty, buttermilkQty].map((v) => Number(v ?? 0));
  if (vals.some((v) => isNaN(v))) return NextResponse.json({ error: "Quantities must be numbers" }, { status: 400 });

  const entry = await prisma.alkeshMilkEntry.create({
    data: {
      date: new Date(date),
      site: String(site).trim(),
      milkTeaQty: vals[0],
      milkPantryQty: vals[1],
      curdQty: vals[2],
      buttermilkQty: vals[3],
      remarks: remarks ?? "",
      enteredBy: auth.session.username ?? "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
