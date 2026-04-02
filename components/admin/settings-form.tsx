"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Mail,
  Settings2,
  TestTube,
  Loader2,
  Shield,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  updateSettings,
  testSmtpConnection,
  testStripeConnection,
  toggleMaintenanceMode,
} from "@/app/actions/admin/settings";
import type { SettingKey } from "@/lib/settings";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingEntry {
  value: string;
  source: "database" | "env" | "unset";
  encrypted: boolean;
}

interface SettingsFormProps {
  settings: Record<string, SettingEntry>;
}

// ─── Field component ─────────────────────────────────────────────────────────

function SettingField({
  settingKey,
  label,
  setting,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  settingKey: string;
  label: string;
  setting: SettingEntry;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={settingKey} className="text-sm font-medium">
          {label}
        </Label>
        {setting.encrypted && (
          <Shield className="h-3 w-3 text-amber-500" />
        )}
        <Badge
          variant={
            setting.source === "database"
              ? "default"
              : setting.source === "env"
              ? "secondary"
              : "outline"
          }
          className="text-[9px] px-1 py-0 h-3.5 font-normal"
        >
          {setting.source === "database"
            ? "DB"
            : setting.source === "env"
            ? "ENV"
            : "Unset"}
        </Badge>
      </div>
      <Input
        id={settingKey}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);

  // Form state — initialize from current settings
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [key, entry] of Object.entries(settings)) {
      init[key] = entry.encrypted ? "" : entry.value;
    }
    return init;
  });

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Save handlers ─────────────────────────────────────────────────

  function handleSaveStripe() {
    startTransition(async () => {
      const stripeKeys: SettingKey[] = [
        "stripe.publishableKey",
        "stripe.secretKey",
        "stripe.webhookSecret",
        "stripe.proPriceId",
      ];
      const toSave = stripeKeys
        .filter((k) => values[k])
        .map((k) => ({ key: k, value: values[k] }));

      const result = await updateSettings(toSave);
      if (result.success) {
        toast.success(`Stripe settings saved (${result.updatedCount} updated)`);
      }
    });
  }

  function handleSaveSmtp() {
    startTransition(async () => {
      const smtpKeys: SettingKey[] = [
        "smtp.host",
        "smtp.port",
        "smtp.user",
        "smtp.password",
        "smtp.secure",
        "smtp.from",
      ];
      const toSave = smtpKeys
        .filter((k) => values[k])
        .map((k) => ({ key: k, value: values[k] }));

      const result = await updateSettings(toSave);
      if (result.success) {
        toast.success(`SMTP settings saved (${result.updatedCount} updated)`);
      }
    });
  }

  function handleSaveGeneral() {
    startTransition(async () => {
      const generalKeys: SettingKey[] = ["app.url"];
      const toSave = generalKeys
        .filter((k) => values[k])
        .map((k) => ({ key: k, value: values[k] }));

      const result = await updateSettings(toSave);
      if (result.success) {
        toast.success("General settings saved");
      }
    });
  }

  // ─── Test handlers ─────────────────────────────────────────────────

  async function handleTestSmtp() {
    setTestingSmtp(true);
    const result = await testSmtpConnection();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setTestingSmtp(false);
  }

  async function handleTestStripe() {
    setTestingStripe(true);
    const result = await testStripeConnection();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setTestingStripe(false);
  }

  async function handleToggleMaintenance() {
    startTransition(async () => {
      const result = await toggleMaintenanceMode();
      toast.success(
        result.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled"
      );
    });
  }

  const maintenanceEnabled = settings["app.maintenanceMode"]?.value === "true";

  return (
    <div className="space-y-6">
      {/* ─── Stripe Settings ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Stripe Configuration</CardTitle>
              <CardDescription>
                Payment processing and subscription billing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingField
            settingKey="stripe.publishableKey"
            label="Publishable Key"
            setting={settings["stripe.publishableKey"]}
            value={values["stripe.publishableKey"]}
            onChange={(v) => updateValue("stripe.publishableKey", v)}
            placeholder="pk_live_..."
          />
          <SettingField
            settingKey="stripe.secretKey"
            label="Secret Key"
            setting={settings["stripe.secretKey"]}
            value={values["stripe.secretKey"]}
            onChange={(v) => updateValue("stripe.secretKey", v)}
            type="password"
            placeholder="sk_live_..."
          />
          <SettingField
            settingKey="stripe.webhookSecret"
            label="Webhook Secret"
            setting={settings["stripe.webhookSecret"]}
            value={values["stripe.webhookSecret"]}
            onChange={(v) => updateValue("stripe.webhookSecret", v)}
            type="password"
            placeholder="whsec_..."
          />
          <SettingField
            settingKey="stripe.proPriceId"
            label="Pro Plan Price ID"
            setting={settings["stripe.proPriceId"]}
            value={values["stripe.proPriceId"]}
            onChange={(v) => updateValue("stripe.proPriceId", v)}
            placeholder="price_..."
          />
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSaveStripe} disabled={isPending} size="sm">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Stripe Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestStripe}
              disabled={testingStripe}
            >
              {testingStripe ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <TestTube className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── SMTP Settings ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>
                Transactional email delivery settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField
              settingKey="smtp.host"
              label="SMTP Host"
              setting={settings["smtp.host"]}
              value={values["smtp.host"]}
              onChange={(v) => updateValue("smtp.host", v)}
              placeholder="smtp.example.com"
            />
            <SettingField
              settingKey="smtp.port"
              label="Port"
              setting={settings["smtp.port"]}
              value={values["smtp.port"]}
              onChange={(v) => updateValue("smtp.port", v)}
              placeholder="587"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField
              settingKey="smtp.user"
              label="Username"
              setting={settings["smtp.user"]}
              value={values["smtp.user"]}
              onChange={(v) => updateValue("smtp.user", v)}
              placeholder="user@example.com"
            />
            <SettingField
              settingKey="smtp.password"
              label="Password"
              setting={settings["smtp.password"]}
              value={values["smtp.password"]}
              onChange={(v) => updateValue("smtp.password", v)}
              type="password"
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField
              settingKey="smtp.secure"
              label="Secure (TLS)"
              setting={settings["smtp.secure"]}
              value={values["smtp.secure"]}
              onChange={(v) => updateValue("smtp.secure", v)}
              placeholder="true or false"
            />
            <SettingField
              settingKey="smtp.from"
              label="From Address"
              setting={settings["smtp.from"]}
              value={values["smtp.from"]}
              onChange={(v) => updateValue("smtp.from", v)}
              placeholder='"Model Rail Ops" <noreply@modelrailops.com>'
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSaveSmtp} disabled={isPending} size="sm">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save SMTP Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSmtp}
              disabled={testingSmtp}
            >
              {testingSmtp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <TestTube className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── General Settings ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Application configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingField
            settingKey="app.url"
            label="Application URL"
            setting={settings["app.url"]}
            value={values["app.url"]}
            onChange={(v) => updateValue("app.url", v)}
            placeholder="https://modelrailops.com"
          />

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`h-5 w-5 ${maintenanceEnabled ? "text-amber-500" : "text-muted-foreground"}`}
              />
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, non-admin users see a maintenance page
                </p>
              </div>
            </div>
            <Button
              variant={maintenanceEnabled ? "destructive" : "outline"}
              size="sm"
              onClick={handleToggleMaintenance}
              disabled={isPending}
            >
              {maintenanceEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSaveGeneral} disabled={isPending} size="sm">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save General Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── System Info (keep from original) ─────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current version and environment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <Badge variant="secondary" className="font-mono">0.1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Environment</span>
            <Badge variant="outline">{process.env.NODE_ENV || "development"}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Database</span>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-sm">PostgreSQL (Neon)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Authentication</span>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-sm">NextAuth.js v5</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
