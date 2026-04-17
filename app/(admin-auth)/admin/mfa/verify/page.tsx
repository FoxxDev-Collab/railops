import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { MfaVerifyForm } from "@/components/admin/mfa-verify-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function MfaVerifyPage() {
  const session = await adminAuth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/auth");
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  if (!dbUser?.mfaEnabled) {
    redirect("/admin/mfa/setup");
  }

  // Check cookie-based MFA verification
  const cookieStore = await cookies();
  const mfaCookie = cookieStore.get("admin-mfa-verified");
  if (mfaCookie?.value === session.user.id) {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardContent className="pt-8 pb-6">
        <MfaVerifyForm />
      </CardContent>
    </Card>
  );
}
