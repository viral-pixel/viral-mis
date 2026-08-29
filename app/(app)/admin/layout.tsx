import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isAdmin) redirect("/");
  return <>{children}</>;
}
