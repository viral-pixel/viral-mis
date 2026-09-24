import { getSession } from "@/app/lib/session";
import { NextResponse } from "next/server";

// Admin, Ketan, and Sandip only — by username, not by module seat.
//
// The "whoever holds this module" indirection used elsewhere (e.g. Misc
// Expenses' responder role via Sandip Reports) doesn't work here: Rajiv
// already holds a real UserModuleAccess row on "Ketan Reports" itself (his
// 2026-09-19 "everything except Vendor Payment" grant, seeded explicitly —
// not the isViewer flag), so gating on "holds Ketan Reports or Sandip
// Reports" would let Rajiv in too. The user was explicit (2026-09-24):
// "Only myself / Sandip / Ketan should be able to see that." A username
// check is the only thing that actually draws that line — if either
// account is ever renamed, update the lists below.
const REQUESTER_USERNAMES = ["ketan", "sandip"];

export type MonthlyRentRole = "admin" | "requester";

export async function requireMonthlyRentAccess() {
  const session = await getSession();
  if (!session.userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (session.isAdmin) {
    return { ok: true as const, session, role: "admin" as MonthlyRentRole };
  }
  if (session.username && REQUESTER_USERNAMES.includes(session.username)) {
    return { ok: true as const, session, role: "requester" as MonthlyRentRole };
  }
  return { ok: false as const, response: NextResponse.json({ error: "Not authorized for Monthly Rent" }, { status: 403 }) };
}

// Same check, exposed as a plain boolean for /api/auth/me to hand to the
// client — the client can't run this check itself, and can't trust the
// ordinary `modules` list either (Rajiv's real module grants would show up
// there too).
export function hasMonthlyRentAccess(username: string | undefined, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return !!username && REQUESTER_USERNAMES.includes(username);
}
