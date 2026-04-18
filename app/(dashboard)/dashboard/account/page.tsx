import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/account/profile-form";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShieldCheck, CreditCard } from "lucide-react";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, plan: true, mfaEnabled: true },
  });

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, password, and security.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileForm email={user.email} initialName={user.name} />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Two-factor authentication</CardTitle>
              </div>
              <CardDescription>
                Add an extra layer of security to your account with an authenticator app.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant={user.mfaEnabled ? "default" : "secondary"}>
                {user.mfaEnabled ? "Enabled" : "Not enabled"}
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/mfa-setup">
                  {user.mfaEnabled ? "Manage" : "Enable"} 2FA
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Billing</CardTitle>
              </div>
              <CardDescription>
                Manage your subscription, seats, and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant={user.plan === "PRO" ? "default" : "secondary"}>
                {user.plan === "PRO" ? "Pro" : "Free"}
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/billing">
                  Go to billing
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
