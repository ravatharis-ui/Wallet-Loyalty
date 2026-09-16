import { requireMerchant } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { HelpContent } from "./help-content";

export const metadata = { title: "Guide" };

export default async function HelpPage() {
  const session = await requireMerchant();
  return <HelpContent joinUrl={`${appUrl()}/join/${session.business.slug}`} />;
}
