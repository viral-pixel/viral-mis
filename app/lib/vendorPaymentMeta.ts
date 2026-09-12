// Metadata for the Vendor Payment sub-module (Sandip Prajapati, Finance &
// Accounts). Kept in one place, same pattern as the other sub-modules'
// *Meta.ts / *Items.ts files, so the slug and option lists aren't duplicated
// between the seed script, API routes, and the page.

export const VENDOR_PAYMENT_SUBMODULE_SLUG = "sandip-vendor-payment";

export const VENDOR_PAYMENT_URGENCY_OPTIONS = ["Normal", "Urgent"] as const;
export const VENDOR_PAYMENT_STATUS_OPTIONS = ["Open", "Closed"] as const;
export const VENDOR_PAYMENT_TYPE_OPTIONS = ["NEFT", "Cheque"] as const;

// Fields Sandip (or any non-admin with module access) is allowed to write.
// Everything else (approvedAmount, datePaid, remarksAdmin, status) is
// Admin's step in the real workflow — enforced here, not just hidden in the
// UI, so calling the API directly can't skip the field-level restriction.
export const VENDOR_PAYMENT_ENTRY_FIELDS = [
  "vendorName", "vendorType", "bankName", "contactDetails",
  "outstandingAmount", "amount", "paymentDate", "paymentType",
  "urgency", "remarksFinance",
] as const;
export const VENDOR_PAYMENT_ADMIN_ONLY_FIELDS = [
  "approvedAmount", "datePaid", "remarksAdmin", "status",
] as const;
