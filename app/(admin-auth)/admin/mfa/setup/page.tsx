import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MfaSetupForm } from "@/components/admin/mfa-setup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default async function MfaSetupPage() {
  const session = await adminAuth();

  // Must be authenticated as admin with mfaPending
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/auth");
  }

  // If MFA is already enabled and verified, go to admin
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  if (dbUser?.mfaEnabled) {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-xl">Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Secure your admin account with an authenticator app.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <MfaSetupForm />
      </CardContent>
    </Card>
  );
}
