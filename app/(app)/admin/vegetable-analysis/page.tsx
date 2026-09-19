import { redirect } from "next/navigation";

// The report moved out of /admin (Management Reports module) so a partner
// can view it; keeps old bookmarks working.
export default function OldVegetableAnalysisRedirect() {
  redirect("/vegetable-analysis");
}
