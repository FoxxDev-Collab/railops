import { auth } from "@/auth";
import { ImpersonationBannerClient } from "./impersonation-banner-client";

export async function ImpersonationBanner() {
  const session = await auth();
  if (!session?.user?.impersonatingFrom) return null;

  return (
    <ImpersonationBannerClient
      email={session.user.email ?? "Unknown"}
    />
  );
}
