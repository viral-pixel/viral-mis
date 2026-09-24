import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireMonthlyRentAccess } from "@/app/lib/monthlyRentAccess";
import { parseUploadedSheet, excelValueToDate, excelValueToNumber } from "@/app/lib/excelIO";

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Accepts this module's own export format (see the export route) — matches
// columns by header name so re-uploading an edited export, or a fresh sheet
// with the same columns, both just work. Matches an existing party by name
// (case-insensitive) and updates it in place; anything new is created —
// this is how "more entries coming later on" (new landlords) get added.
export async function POST(req: NextRequest) {
  const auth = await requireMonthlyRentAccess();
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const rows = await parseUploadedSheet(file);
  if (rows.length === 0) return NextResponse.json({ error: "Sheet is empty" }, { status: 400 });

  const keys = Object.keys(rows[0]);
  const find = (label: string) => keys.find((k) => norm(k) === norm(label));
  const nameKey = find("Party Name");
  if (!nameKey) return NextResponse.json({ error: "Column 'Party Name' not found" }, { status: 400 });

  const siteKey = find("Site Name"), typeKey = find("Type of Pay"), amtKey = find("Amount"), tdsKey = find("TDS Deduction"),
    netKey = find("Net Pay"), modeKey = find("Mode of Pay"), dateOfPayKey = find("Approx Date of Pay"), mobileKey = find("Mobile No."),
    statusKey = find("Status"), depDateKey = find("Deposit Date"), depAmtKey = find("Deposit Amount"), remarksKey = find("Remarks"), srKey = find("Sr. No.");

  const existing = await prisma.rentParty.findMany();
  const byName = new Map(existing.map((p) => [norm(p.partyName), p]));

  const importBatch = `import-rent-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const enteredBy = auth.session.username ?? "";
  let created = 0, updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const partyName = String(row[nameKey] ?? "").trim();
    if (!partyName) continue;

    const data = {
      srNo: srKey ? (excelValueToNumber(row[srKey]) ?? null) : null,
      partyName,
      siteName: siteKey ? String(row[siteKey] ?? "").trim() : "",
      typeOfPay: typeKey ? String(row[typeKey] ?? "").trim() : "",
      amount: amtKey ? excelValueToNumber(row[amtKey]) : null,
      tdsDeduction: tdsKey ? (excelValueToNumber(row[tdsKey]) ?? 0) : 0,
      netPay: netKey ? excelValueToNumber(row[netKey]) : null,
      modeOfPay: modeKey ? String(row[modeKey] ?? "").trim() : "",
      approxDateOfPay: dateOfPayKey ? String(row[dateOfPayKey] ?? "").trim() : "",
      mobileNo: mobileKey ? String(row[mobileKey] ?? "").trim() : "",
      status: statusKey && String(row[statusKey] ?? "").trim().toUpperCase() === "NOT ACTIVE" ? "NOT ACTIVE" : "ACTIVE",
      depositDate: depDateKey ? excelValueToDate(row[depDateKey]) : null,
      depositAmount: depAmtKey ? excelValueToNumber(row[depAmtKey]) : null,
      remarks: remarksKey ? String(row[remarksKey] ?? "").trim() : "",
      importBatch,
    };

    try {
      const found = byName.get(norm(partyName));
      if (found) {
        await prisma.rentParty.update({ where: { id: found.id }, data });
        updated++;
      } else {
        const p = await prisma.rentParty.create({ data: { ...data, enteredBy } });
        byName.set(norm(partyName), p);
        created++;
      }
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
