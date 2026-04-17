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

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/auth");
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  if (dbUser?.mfaEnabled) {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="text-center space-y-3 pb-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle className="font-display text-xl font-bold tracking-tight">
            Set Up Two-Factor Authentication
          </CardTitle>
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
