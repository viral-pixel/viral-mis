// Config-driven definition of the 8 tables that make up Ketan's first
// sub-module ("Agreements, Licenses & Insurance"). Every table here has the
// same basic shape (a site/entity + one or more date pairs + status text),
// so a single generic API route + list/form UI (app/api/compliance/[entity],
// app/(app)/compliance/[entity]) drives all 8 instead of duplicating a
// CRUD screen 8 times. Field `key`s must exactly match the Prisma model's
// field names.

// Stable identifier for this sub-module, independent of the owning Module's
// display name (which may be renamed later, e.g. if "Ketan" leaves).
export const COMPLIANCE_SUBMODULE_SLUG = "ketan-compliance";

export type FieldType = "text" | "longtext" | "number" | "date" | "select";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface ExpiryFieldConfig {
  key: string;
  label: string;
}

export interface EntityConfig {
  slug: string; // URL segment
  model: string; // Prisma Client delegate name (camelCase)
  label: string; // display name
  titleFields: string[]; // fields combined to label a row in tables/reminders
  fields: FieldConfig[];
  expiryFields: ExpiryFieldConfig[];
}

const STATUS_OPTIONS = ["Active", "Closed"];

export const COMPLIANCE_ENTITIES: EntityConfig[] = [
  {
    slug: "agreements",
    model: "clientAgreement",
    label: "PO & Agreement & Service Order",
    titleFields: ["siteName"],
    fields: [
      { key: "siteName", label: "Site Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "contractType", label: "Type of Contract", type: "text" },
      { key: "siteStatus", label: "Current Status", type: "select", options: STATUS_OPTIONS },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "remarks", label: "Remarks", type: "longtext" },
    ],
    expiryFields: [{ key: "endDate", label: "Agreement End" }],
  },
  {
    slug: "food-license",
    model: "foodLicense",
    label: "Food License (FSSAI)",
    titleFields: ["siteName"],
    fields: [
      { key: "siteName", label: "Site Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "contractType", label: "Type of Contract", type: "text" },
      { key: "siteStatus", label: "Current Status", type: "select", options: STATUS_OPTIONS },
      { key: "hasLicense", label: "License Held (Yes/No/NA)", type: "text" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
    ],
    expiryFields: [{ key: "endDate", label: "FSSAI End" }],
  },
  {
    slug: "wc-policy",
    model: "wcPolicy",
    label: "WC Policy",
    titleFields: ["siteName"],
    fields: [
      { key: "siteName", label: "Site Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "contractType", label: "Type of Contract", type: "text" },
      { key: "siteStatus", label: "Current Status", type: "select", options: STATUS_OPTIONS },
      { key: "hasPolicy", label: "Policy Held (Yes/No/NA)", type: "text" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "remarks", label: "Remarks", type: "longtext" },
    ],
    expiryFields: [{ key: "endDate", label: "WC Policy End" }],
  },
  {
    slug: "labour-license",
    model: "labourLicense",
    label: "Labour License",
    titleFields: ["siteName"],
    fields: [
      { key: "siteName", label: "Site Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "contractType", label: "Type of Contract", type: "text" },
      { key: "siteStatus", label: "Current Status", type: "select", options: STATUS_OPTIONS },
      { key: "licenseStatus", label: "Status (NR/YES)", type: "text" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "licenseNo", label: "License No", type: "text" },
      { key: "count", label: "Count", type: "number" },
    ],
    expiryFields: [{ key: "endDate", label: "License End" }],
  },
  {
    slug: "vehicles",
    model: "vehicleAgreement",
    label: "Vehicle Agreement",
    titleFields: ["vehicleNo"],
    fields: [
      { key: "vehicleNo", label: "Vehicle No", type: "text" },
      { key: "vehicleType", label: "Vehicle Type", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "site", label: "Site", type: "text" },
      { key: "agreementStart", label: "Agreement Start", type: "date" },
      { key: "agreementEnd", label: "Agreement End", type: "date" },
      { key: "insuranceStart", label: "Insurance Start", type: "date" },
      { key: "insuranceEnd", label: "Insurance End", type: "date" },
      { key: "pucStart", label: "PUC Start", type: "date" },
      { key: "pucEnd", label: "PUC End", type: "date" },
      { key: "fitnessEnd", label: "Fitness Certificate End", type: "date" },
      { key: "registrationDate", label: "Registration Date", type: "date" },
      { key: "usedFor", label: "Vehicle Used For", type: "text" },
      { key: "ownerName", label: "Name Of Owner", type: "text" },
      { key: "active", label: "Active", type: "select", options: ["Active", "Close"] },
    ],
    expiryFields: [
      { key: "agreementEnd", label: "Agreement End" },
      { key: "insuranceEnd", label: "Insurance End" },
      { key: "pucEnd", label: "PUC End" },
      { key: "fitnessEnd", label: "Fitness Certificate End" },
    ],
  },
  {
    slug: "fire-insurance",
    model: "fireInsurance",
    label: "Fire Insurance",
    titleFields: ["premises"],
    fields: [
      { key: "premises", label: "Premises", type: "text" },
      { key: "address", label: "Address", type: "longtext" },
      { key: "company", label: "Company", type: "text" },
      { key: "policyAmount", label: "Policy Amount", type: "number" },
      { key: "insuredAmount", label: "Insured Amount (Rs.)", type: "number" },
      { key: "commencementDate", label: "Date of Commencement", type: "date" },
      { key: "validTill", label: "Valid Till", type: "date" },
      { key: "insuredFor", label: "Insured For", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
    expiryFields: [{ key: "validTill", label: "Policy Valid Till" }],
  },
  {
    slug: "partner-insurance",
    model: "partnerInsurance",
    label: "Partner Insurance",
    titleFields: ["proposerName"],
    fields: [
      { key: "proposerName", label: "Proposer Name", type: "text" },
      { key: "companyName", label: "Company Name", type: "text" },
      { key: "relation", label: "Relation", type: "text" },
      { key: "mobileNo", label: "Mobile No", type: "text" },
      { key: "dob", label: "DOB", type: "date" },
      { key: "policyNo", label: "Policy No", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "issueDate", label: "Issue Date", type: "date" },
      { key: "validDate", label: "Valid Date", type: "date" },
    ],
    expiryFields: [{ key: "validDate", label: "Policy Valid Date" }],
  },
  {
    slug: "rent-agreement",
    model: "rentAgreement",
    label: "Rent Agreement",
    titleFields: ["premises"],
    fields: [
      { key: "premises", label: "Premises", type: "text" },
      { key: "address", label: "Address", type: "longtext" },
      { key: "agreementDate", label: "Agreement Date", type: "date" },
      { key: "validTill", label: "Valid Till", type: "date" },
      { key: "noOfYears", label: "No of Years", type: "number" },
      { key: "ownerName", label: "Owner Name", type: "text" },
      { key: "monthlyRent", label: "Monthly Rent", type: "number" },
      { key: "deposit", label: "Deposit", type: "number" },
      { key: "additionalRemarks", label: "Additional Remarks", type: "longtext" },
      { key: "status", label: "Status", type: "text" },
    ],
    expiryFields: [{ key: "validTill", label: "Rent Valid Till" }],
  },
];

export function getEntityConfig(slug: string): EntityConfig | undefined {
  return COMPLIANCE_ENTITIES.find((e) => e.slug === slug);
}

export function entityRowTitle(entity: EntityConfig, row: Record<string, unknown>): string {
  return entity.titleFields.map((f) => row[f] ?? "").filter(Boolean).join(" — ") || `#${row.id}`;
}

// Coerces raw JSON-body strings into the types Prisma expects (Date objects
// for date fields, numbers for number fields) per the entity's field config.
export function coerceEntityBody(entitySlug: string, body: Record<string, unknown>) {
  const entity = getEntityConfig(entitySlug)!;
  const data: Record<string, unknown> = {};
  for (const field of entity.fields) {
    const raw = body[field.key];
    if (field.type === "date") {
      data[field.key] = raw ? new Date(raw as string) : null;
    } else if (field.type === "number") {
      data[field.key] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
    } else {
      data[field.key] = raw ?? "";
    }
  }
  return data;
}
