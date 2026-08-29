// One-off import of the real MIS_Ketan Format.xlsx workbook into the
// compliance tables. Column positions are hardcoded per sheet (header rows
// are inconsistent across sheets — some have a title row, Vehicle Agreement
// has two header rows, some have none), based on a direct read of the real
// file. Covid-19 sheet intentionally excluded per user decision (2026-08-29,
// legacy/no longer active).
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();
const FILE = "C:\\Users\\HP\\OneDrive\\Desktop\\AI\\Analysis Related\\Ketan Related\\MIS_Ketan Format.xlsx";
const BATCH = `ketan-mis-${new Date().toISOString().slice(0, 10)}`;

// Read with cellDates:false (see below) so every date cell arrives as a
// raw Excel day-serial number, then converted here via SSF's date-code
// parser — verified correct against a real cell's Excel formula-bar value
// (serial 45658 = "01-01-2025", matching parse_date_code exactly).
// Do NOT trust `cellDates: true`: it was tried first and is measurably
// wrong — it turned that same serial into "2024-12-31T18:29:50Z", a
// different calendar day plus a bogus time-of-day (caught 2026-08-29 when
// the user cross-checked a real cell against Excel's own formula bar).
function asDate(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string" && v.trim().toUpperCase() === "NA") return null;
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)));
  }
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}
function asNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function asInt(v: unknown): number | null {
  const n = asNum(v);
  return n === null ? null : Math.trunc(n);
}
function asStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

async function clearPreviousImport() {
  const models = [
    prisma.clientAgreement, prisma.foodLicense, prisma.wcPolicy, prisma.labourLicense,
    prisma.vehicleAgreement, prisma.fireInsurance, prisma.partnerInsurance, prisma.rentAgreement,
  ];
  for (const m of models) {
    // @ts-expect-error -- deleteMany's where shape is identical across these models
    await m.deleteMany({ where: { importBatch: { startsWith: "ketan-mis-" } } });
  }
}

async function main() {
  await clearPreviousImport();
  const wb = XLSX.readFile(FILE, { cellDates: false });
  const sheet = (name: string) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "" });

  {
    const rows = sheet("PO & Agreement & Service Order").slice(2);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[0])) continue;
      await prisma.clientAgreement.create({
        data: {
          siteName: asStr(r[0]), location: asStr(r[1]), contractType: asStr(r[2]), siteStatus: asStr(r[3]),
          startDate: asDate(r[5]), endDate: asDate(r[6]), remarks: asStr(r[7]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("ClientAgreement:", n);
  }

  {
    const rows = sheet("Food Lincese (FSSAI)").slice(2);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[0])) continue;
      await prisma.foodLicense.create({
        data: {
          siteName: asStr(r[0]), location: asStr(r[1]), contractType: asStr(r[2]), siteStatus: asStr(r[3]),
          hasLicense: asStr(r[4]), startDate: asDate(r[5]), endDate: asDate(r[6]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("FoodLicense:", n);
  }

  {
    const rows = sheet("WC Policy").slice(2);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[0])) continue;
      await prisma.wcPolicy.create({
        data: {
          siteName: asStr(r[0]), location: asStr(r[1]), contractType: asStr(r[2]), siteStatus: asStr(r[3]),
          hasPolicy: asStr(r[4]), startDate: asDate(r[5]), endDate: asDate(r[6]), remarks: asStr(r[7]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("WcPolicy:", n);
  }

  {
    const rows = sheet("Labour License").slice(2);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[1])) continue;
      await prisma.labourLicense.create({
        data: {
          siteName: asStr(r[1]), location: asStr(r[2]), contractType: asStr(r[3]), siteStatus: asStr(r[4]),
          licenseStatus: asStr(r[5]), startDate: asDate(r[6]), endDate: asDate(r[7]),
          licenseNo: asStr(r[8]), count: asInt(r[9]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("LabourLicense:", n);
  }

  {
    const rows = sheet("Vehicle Agreement").slice(2);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[0])) continue;
      await prisma.vehicleAgreement.create({
        data: {
          vehicleNo: asStr(r[0]), vehicleType: asStr(r[1]), location: asStr(r[2]), site: asStr(r[3]),
          agreementStart: asDate(r[4]), agreementEnd: asDate(r[5]),
          insuranceStart: asDate(r[6]), insuranceEnd: asDate(r[7]),
          pucStart: asDate(r[8]), pucEnd: asDate(r[9]),
          fitnessEnd: asDate(r[10]),
          registrationDate: asDate(r[11]), usedFor: asStr(r[12]), ownerName: asStr(r[13]),
          active: asStr(r[14]) || "Active",
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("VehicleAgreement:", n);
  }

  {
    const rows = sheet("Fire Insurance").slice(1);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[0])) continue;
      await prisma.fireInsurance.create({
        data: {
          premises: asStr(r[0]), address: asStr(r[1]), company: asStr(r[2]),
          policyAmount: asNum(r[3]), insuredAmount: asNum(r[4]),
          commencementDate: asDate(r[5]), validTill: asDate(r[6]), insuredFor: asStr(r[7]), remarks: asStr(r[8]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("FireInsurance:", n);
  }

  {
    const rows = sheet("Partner Insurance").slice(1);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[1])) continue;
      await prisma.partnerInsurance.create({
        data: {
          proposerName: asStr(r[1]), companyName: asStr(r[2]), relation: asStr(r[3]), mobileNo: asStr(r[4]),
          dob: asDate(r[5]), policyNo: asStr(r[6]), company: asStr(r[7]),
          issueDate: asDate(r[8]), validDate: asDate(r[9]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("PartnerInsurance:", n);
  }

  {
    const rows = sheet("Rent Agreement").slice(1);
    let n = 0;
    for (const r of rows) {
      if (!asStr(r[1])) continue;
      await prisma.rentAgreement.create({
        data: {
          premises: asStr(r[1]), address: asStr(r[2]),
          agreementDate: asDate(r[3]), validTill: asDate(r[4]),
          noOfYears: asInt(r[5]), ownerName: asStr(r[6]),
          monthlyRent: asNum(r[7]), deposit: asNum(r[8]),
          additionalRemarks: asStr(r[9]), status: asStr(r[10]),
          enteredBy: "import", importBatch: BATCH,
        },
      });
      n++;
    }
    console.log("RentAgreement:", n);
  }

  console.log("Import batch:", BATCH);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
