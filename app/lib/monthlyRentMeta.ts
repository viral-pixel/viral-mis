// Metadata for the Monthly Rent workflow (Ketan Reports module, but visible
// only to Admin/Ketan/Sandip — see app/lib/monthlyRentAccess.ts). No
// SubModule slug/route wiring here on purpose: it's deliberately kept off
// the ordinary Module/SubModule nav system so a global viewer (Rajiv) can't
// see it just by holding "Ketan Reports" or "Sandip Reports".

export const MONTHLY_RENT_STATUS_OPTIONS = ["ACTIVE", "NOT ACTIVE"] as const;
export const RENT_PAYMENT_STATUS_OPTIONS = ["Open", "Closed"] as const;

export const RENT_TYPE_OF_PAY_SUGGESTIONS = [
  "House Rent", "Car Rent", "Kitchen Rent", "Laundry Rent", "Shed Rent",
  "Office Rent", "Land Rent", "Building Rent", "Maintenance",
] as const;
export const RENT_MODE_OF_PAY_OPTIONS = ["Net Banking", "Cheque"] as const;

// Capitalizes the first letter after the start of the string or a space /
// hyphen / "(" / "/" — deliberately does NOT lowercase the rest of a word,
// so acronyms already in the data (e.g. "AMW House", "KCCB Loan") survive
// untouched instead of becoming "Amw"/"Kccb" (2026-09-24, user's request:
// "Make all party name first letter of the word capital").
export function toTitleCase(s: string): string {
  return s.replace(/(^|[\s\-(/])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

// Financial year = Apr-Mar (India). Shared between the Payment History tab
// and the Party Ledger export so the two never disagree on which FY a given
// payment falls into.
export function fyLabel(d: Date): string {
  const y = d.getUTCFullYear();
  const startYear = d.getUTCMonth() >= 3 ? y : y - 1; // getUTCMonth() 0-11, April = 3
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}
