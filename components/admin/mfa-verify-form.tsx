"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyMfaCode } from "@/app/actions/admin/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export function MfaVerifyForm() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    if (!code.trim()) return;
    setIsLoading(true);

    const result = await verifyMfaCode(code);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      if (result.backupCodeUsed) {
        toast.warning(
          `Backup code used. ${result.remainingCodes} remaining.`
        );
      }
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground">
          {useBackupCode
            ? "Enter one of your backup codes."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
      </div>

      <div className="space-y-4">
        {useBackupCode ? (
          <Input
            type="text"
            placeholder="xxxx-xxxx"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center text-lg tracking-wider font-mono"
            autoFocus
          />
        ) : (
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
          />
        )}

        <Button
          onClick={handleVerify}
          className="w-full"
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode("");
          }}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {useBackupCode
            ? "Use authenticator code instead"
            : "Use a backup code instead"}
        </button>
      </div>
    </div>
  );
}
