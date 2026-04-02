import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MfaVerifyForm } from "@/components/admin/mfa-verify-form";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default async function MfaVerifyPage() {
  const session = await adminAuth();

  // Must be authenticated as admin
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/auth");
  }

  // If MFA is not enabled, redirect to setup
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  if (!dbUser?.mfaEnabled) {
    redirect("/admin/mfa/setup");
  }

  // If already verified (session flag), go to admin
  const mfaVerified = (session as unknown as Record<string, unknown>).mfaVerified;
  if (mfaVerified) {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50">
      <CardHeader />
      <CardContent>
        <MfaVerifyForm />
      </CardContent>
    </Card>
  );
}
