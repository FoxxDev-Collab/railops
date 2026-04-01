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

  // Already authenticated as admin — go to admin dashboard
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>Authorized personnel only</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
      </CardContent>
    </Card>
  );
}
