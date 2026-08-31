// Maps a SubModule's stable `slug` to the page that implements it. Every
// sub-module's actual data/UI is bespoke code (only the nav entry + access
// control are generic), so this is the one place that wires a DB row to a
// real route. Add an entry here whenever a new sub-module is built.
import { COMPLIANCE_SUBMODULE_SLUG } from "@/app/lib/complianceEntities";
import { PURCHASE_SUBMODULE_SLUG } from "@/app/lib/purchaseGroups";
import { VEGETABLE_SUBMODULE_SLUG } from "@/app/lib/vegetableItems";
import { ROTI_SUBMODULE_SLUG } from "@/app/lib/rotiMeta";

export const SUBMODULE_ROUTES: Record<string, string> = {
  [COMPLIANCE_SUBMODULE_SLUG]: "/compliance",
  [PURCHASE_SUBMODULE_SLUG]: "/purchase",
  [VEGETABLE_SUBMODULE_SLUG]: "/vegetable",
  [ROTI_SUBMODULE_SLUG]: "/roti",
};
