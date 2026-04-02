"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateMfaSetup, confirmMfaSetup } from "@/app/actions/admin/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Copy, Check, ShieldCheck } from "lucide-react";

type SetupStep = "loading" | "scan" | "backup" | "confirm";

export function MfaSetupForm() {
  const [step, setStep] = useState<SetupStep>("loading");
  const [qrDataUri, setQrDataUri] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const router = useRouter();

  useEffect(() => {
    startSetup();
  }, []);

  async function startSetup() {
    setIsLoading(true);
    const result = await generateMfaSetup();
    setQrDataUri(result.qrDataUri);
    setManualSecret(result.secret);
    setBackupCodes(result.backupCodes);
    setStep("scan");
    setIsLoading(false);
  }

  async function handleConfirm() {
    if (!confirmCode.trim()) return;
    setIsLoading(true);
    const result = await confirmMfaSetup(confirmCode);
    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success("MFA enabled successfully");
      router.push("/admin");
      router.refresh();
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <p className="text-sm text-muted-foreground">
            Open your authenticator app and scan this QR code.
          </p>
        </div>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUri} alt="TOTP QR Code" className="rounded-lg border" width={200} height={200} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Or enter this code manually:
          </p>
          <code className="block text-center text-sm font-mono bg-muted p-2 rounded break-all select-all">
            {manualSecret}
          </code>
        </div>

        <Button onClick={() => setStep("backup")} className="w-full">
          Next: View Backup Codes
        </Button>
      </div>
    );
  }

  if (step === "backup") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Save Your Backup Codes</h3>
          <p className="text-sm text-muted-foreground">
            These codes can be used to access your account if you lose your authenticator. Each code can only be used once. Save them somewhere safe.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
          {backupCodes.map((code) => (
            <code key={code} className="text-sm font-mono text-center py-1">
              {code}
            </code>
          ))}
        </div>

        <Button variant="outline" onClick={copyBackupCodes} className="w-full">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy Backup Codes
            </>
          )}
        </Button>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={backupAcknowledged}
            onChange={(e) => setBackupAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-muted-foreground">
            I have saved these backup codes in a secure location.
          </span>
        </label>

        <Button
          onClick={() => setStep("confirm")}
          className="w-full"
          disabled={!backupAcknowledged}
        >
          Next: Confirm Setup
        </Button>
      </div>
    );
  }

  // step === "confirm"
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Confirm Setup</h3>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to confirm setup.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em] font-mono"
          autoFocus
        />

        <Button
          onClick={handleConfirm}
          className="w-full"
          disabled={isLoading || confirmCode.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Enable MFA"
          )}
        </Button>
      </div>
    </div>
  );
}
