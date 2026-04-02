"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getMfaStatus,
  regenerateBackupCodes,
  disableMfa,
} from "@/app/actions/admin/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

export function MfaSettings() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    backupCodesRemaining: number;
    backupCodesUsed: number;
  } | null>(null);
  const [action, setAction] = useState<"idle" | "regenerate" | "disable">("idle");
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getMfaStatus().then(setStatus);
  }, []);

  async function handleRegenerate() {
    if (totpCode.length !== 6) return;
    setIsLoading(true);
    const result = await regenerateBackupCodes(totpCode);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewBackupCodes(result.backupCodes!);
      toast.success("Backup codes regenerated");
      getMfaStatus().then(setStatus);
    }
    setTotpCode("");
    setAction("idle");
    setIsLoading(false);
  }

  async function handleDisable() {
    if (totpCode.length !== 6) return;
    setIsLoading(true);
    const result = await disableMfa(totpCode);
    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success("MFA disabled");
      router.push("/admin/mfa/setup");
      router.refresh();
    }
  }

  function copyBackupCodes() {
    if (!newBackupCodes) return;
    navigator.clipboard.writeText(newBackupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground">
              {status.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {status.backupCodesRemaining} backup codes remaining
          </span>
          {status.backupCodesRemaining <= 2 && status.backupCodesRemaining > 0 && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          {status.backupCodesRemaining === 0 && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* New backup codes display (after regeneration) */}
      {newBackupCodes && (
        <div className="space-y-4 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/5">
          <div className="space-y-1">
            <h4 className="font-medium">New Backup Codes</h4>
            <p className="text-sm text-muted-foreground">
              Save these codes. They will not be shown again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
            {newBackupCodes.map((code) => (
              <code key={code} className="text-sm font-mono text-center py-1">
                {code}
              </code>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copyBackupCodes} className="flex-1">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setNewBackupCodes(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {action === "idle" && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setAction("regenerate")}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate Backup Codes
          </Button>
          <Button
            variant="outline"
            onClick={() => setAction("disable")}
            className="text-destructive hover:text-destructive"
          >
            <ShieldOff className="mr-2 h-4 w-4" />
            Disable MFA
          </Button>
        </div>
      )}

      {/* Confirm action with TOTP code */}
      {action !== "idle" && (
        <div className="space-y-4 p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            {action === "regenerate"
              ? "Enter your current TOTP code to regenerate backup codes."
              : "Enter your current TOTP code to disable MFA. You will need to set it up again."}
          </p>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.5em] font-mono max-w-xs"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              onClick={action === "regenerate" ? handleRegenerate : handleDisable}
              disabled={isLoading || totpCode.length !== 6}
              variant={action === "disable" ? "destructive" : "default"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {action === "regenerate" ? "Regenerating..." : "Disabling..."}
                </>
              ) : (
                action === "regenerate" ? "Regenerate" : "Disable MFA"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAction("idle");
                setTotpCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
