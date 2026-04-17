"use client";

import { useState } from "react";
import { verifyMfaCode } from "@/app/actions/admin/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";

export function MfaVerifyForm() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

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
      window.location.href = "/admin";
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
          {useBackupCode ? (
            <KeyRound className="h-6 w-6 text-primary" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold tracking-tight">
            {useBackupCode ? "Backup Code" : "Two-Factor Authentication"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {useBackupCode
              ? "Enter one of your saved backup codes."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
        {useBackupCode ? (
          <Input
            type="text"
            placeholder="xxxx-xxxx"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center text-lg tracking-wider font-mono h-14 border-2 focus:border-primary"
            autoFocus
          />
        ) : (
          <div>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="------"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.4em] font-mono h-14 border-2 focus:border-primary"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Code refreshes every 30 seconds
            </p>
          </div>
        )}

        <Button
          type="submit"
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
          className="w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {useBackupCode
            ? "Use authenticator code instead"
            : "Lost your device? Use a backup code"}
        </button>
      </form>
    </div>
  );
}
