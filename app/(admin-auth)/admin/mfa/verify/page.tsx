import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
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

  const mfaVerified = (session as unknown as Record<string, unknown>).mfaVerified;
  if (mfaVerified) {
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
