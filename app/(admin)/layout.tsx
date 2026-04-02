import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await adminAuth();

  // Require admin authentication
  if (!session?.user) {
    redirect("/admin/auth");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // MFA gate: check if MFA setup or verification is needed
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  const mfaPending = (session as Record<string, unknown>).mfaPending;
  const mfaVerified = (session as Record<string, unknown>).mfaVerified;

  if (!dbUser?.mfaEnabled) {
    // MFA not set up — force setup
    redirect("/admin/mfa/setup");
  }

  if (mfaPending && !mfaVerified) {
    // MFA enabled but not verified this session
    redirect("/admin/mfa/verify");
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="admin" />
      <SidebarInset>
        <ImpersonationBanner />
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="font-semibold">Model Rail Ops Admin</span>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
