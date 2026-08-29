import { redirect } from "next/navigation";
import { COMPLIANCE_ENTITIES } from "@/app/lib/complianceEntities";

export default function ComplianceIndexPage() {
  redirect(`/compliance/${COMPLIANCE_ENTITIES[0].slug}`);
}
