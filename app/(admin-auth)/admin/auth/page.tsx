import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default async function AdminAuthPage() {
  const session = await adminAuth();

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle className="font-display text-xl font-bold tracking-tight">
            Admin Access
          </CardTitle>
          <CardDescription>Authorized personnel only</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
      </CardContent>
    </Card>
  );
}
