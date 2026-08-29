import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import { Shell } from "@/app/components/Shell";

// Server-side gate: every route under this group requires a session.
// (Individual API routes still enforce their own module-level access on
// top of this — this only guarantees "signed in", not "allowed here".)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  return <Shell>{children}</Shell>;
}
