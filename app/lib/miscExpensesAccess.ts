import { prisma } from "@/app/lib/prisma";
import { requireModuleAccessBySubModuleSlug } from "@/app/lib/authz";
import { MISC_SUBMODULE_SLUG } from "@/app/lib/miscExpensesMeta";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";

// Everyone with this module can VIEW everything. On top of that:
//   admin     - edit/delete/upload, and raise queries
//   raiser    - raise queries (Rajiv)
//   responder - answer & close queries, cannot raise (Sandip)
//
// Users & Access only assigns whole modules, so the responder is whoever
// holds the Sandip Reports module (the finance-manager seat) — replacing
// Sandip later is just giving the new person that module, no code change.
export type MiscRole = "admin" | "raiser" | "responder";

export async function requireMiscAccess() {
  const auth = await requireModuleAccessBySubModuleSlug(MISC_SUBMODULE_SLUG);
  if (!auth.ok) return auth;

  let role: MiscRole = "raiser";
  if (auth.session.isAdmin) {
    role = "admin";
  } else {
    const financeSeat = await prisma.userModuleAccess.findFirst({
      where: { userId: auth.session.userId, module: { subModules: { some: { slug: VENDOR_PAYMENT_SUBMODULE_SLUG } } } },
    });
    if (financeSeat) role = "responder";
  }
  return { ok: true as const, session: auth.session, role };
}
