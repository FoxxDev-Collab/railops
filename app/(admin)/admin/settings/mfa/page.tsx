import { MfaSettings } from "@/components/admin/mfa-settings";

export default function MfaSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MFA Settings</h1>
        <p className="text-muted-foreground">
          Manage two-factor authentication for your admin account.
        </p>
      </div>
      <MfaSettings />
    </div>
  );
}
