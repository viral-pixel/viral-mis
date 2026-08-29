import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/authz";

// Admin-only (unlike the equivalent feature in the other two tools, which
// lets any signed-in teammate reset anyone's password — viral-mis has real
// privilege separation between Admin and module-scoped Entry users, so
// only Admin can do this here). Use /api/auth/change-password for your own
// account instead.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { username, newPassword } = await req.json();
  if (!username || !newPassword || String(newPassword).length < 8) {
    return NextResponse.json({ error: "Username and a new password (min 8 characters) are required" }, { status: 400 });
  }
  if (String(username).trim().toLowerCase() === auth.session.username) {
    return NextResponse.json({ error: "Use the change-your-own-password form for your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username: String(username).trim().toLowerCase() } });
  if (!target) return NextResponse.json({ error: "No such user" }, { status: 404 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
