import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { getAdminSettings } from "@/app/actions/admin/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SystemSettingsPage() {
  const session = await adminAuth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const settings = await getAdminSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure Stripe billing, SMTP email, and application settings
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
