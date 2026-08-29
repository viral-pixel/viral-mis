import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getAccessibleModules } from "@/app/lib/authz";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ user: null }, { status: 401 });

  const modules = await getAccessibleModules(session.userId, !!session.isAdmin);

  return NextResponse.json({
    user: {
      username: session.username,
      displayName: session.displayName,
      isAdmin: !!session.isAdmin,
    },
    modules,
  });
}
