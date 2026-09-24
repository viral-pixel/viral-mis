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
