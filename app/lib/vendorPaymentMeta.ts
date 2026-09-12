// Metadata for the Vendor Payment sub-module (Sandip Prajapati, Finance &
// Accounts). Kept in one place, same pattern as the other sub-modules'
// *Meta.ts / *Items.ts files, so the slug and option lists aren't duplicated
// between the seed script, API routes, and the page.

export const VENDOR_PAYMENT_SUBMODULE_SLUG = "sandip-vendor-payment";

export const VENDOR_PAYMENT_URGENCY_OPTIONS = ["Normal", "Urgent"] as const;
export const VENDOR_PAYMENT_STATUS_OPTIONS = ["Open", "Closed"] as const;
