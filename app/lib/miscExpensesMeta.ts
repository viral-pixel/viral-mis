// "Miscellaneous Expenses" sub-module (Company Expenses module).
export const MISC_MODULE_NAME = "Company Expenses";
export const MISC_SUBMODULE_SLUG = "company-misc-expenses";

// A month counts as a "big" expense when it is at least this multiple of the
// average month — relative on purpose, so it keeps meaning something as
// months are added (a fixed rupee cut-off would go stale).
export const BIG_EXPENSE_FACTOR = 1.5;
