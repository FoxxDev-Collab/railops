"use client";

import { useState, useEffect } from "react";
import { generateMfaSetup, confirmMfaSetup } from "@/app/actions/admin/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  QrCode,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

type SetupStep = "loading" | "scan" | "backup" | "confirm";

const STEPS = [
  { key: "scan", label: "Scan" },
  { key: "backup", label: "Backup" },
  { key: "confirm", label: "Confirm" },
] as const;

function StepIndicator({ current }: { current: SetupStep }) {
  if (current === "loading") return null;
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-all duration-300 ${
              i < currentIndex
                ? "bg-primary text-primary-foreground"
                : i === currentIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIndex ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              i + 1
            )}
          </div>
          <span
            className={`text-xs font-medium hidden sm:inline ${
              i === currentIndex
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-px mx-1 transition-colors duration-300 ${
                i < currentIndex ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function MfaSetupForm() {
  const [step, setStep] = useState<SetupStep>("loading");
  const [qrDataUri, setQrDataUri] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);

  useEffect(() => {
    generateMfaSetup().then((result) => {
      setQrDataUri(result.qrDataUri);
      setManualSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setStep("scan");
      setIsLoading(false);
    });
  }, []);

  async function handleConfirm() {
    if (!confirmCode.trim()) return;
    setIsLoading(true);
    const result = await confirmMfaSetup(confirmCode);
    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      toast.success("MFA enabled successfully");
      window.location.href = "/admin";
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating secure keys...</p>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="space-y-6">
        <StepIndicator current="scan" />

        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            <QrCode className="h-3.5 w-3.5" />
            Step 1
          </div>
          <h3 className="font-display text-lg font-bold tracking-tight">
            Scan QR Code
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Open your authenticator app and scan this code to link your account.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="rounded-xl border-2 border-dashed border-border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUri}
              alt="TOTP QR Code"
              className="rounded-lg"
              width={180}
              height={180}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-center">
            Manual entry code
          </p>
          <div className="relative">
            <code className="block text-center text-[13px] font-mono bg-muted/60 border border-border px-4 py-2.5 rounded-lg break-all select-all tracking-wide">
              {manualSecret}
            </code>
          </div>
        </div>

        <Button onClick={() => setStep("backup")} className="w-full">
          Continue
        </Button>
      </div>
    );
  }

  if (step === "backup") {
    return (
      <div className="space-y-6">
        <StepIndicator current="backup" />

        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            <KeyRound className="h-3.5 w-3.5" />
            Step 2
          </div>
          <h3 className="font-display text-lg font-bold tracking-tight">
            Save Backup Codes
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Store these in a safe place. Each code works once if you lose your authenticator.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {backupCodes.map((code, i) => (
              <div
                key={code}
                className="flex items-center gap-2 py-1"
              >
                <span className="text-[10px] text-muted-foreground tabular-nums w-3">
                  {i + 1}.
                </span>
                <code className="text-sm font-mono tracking-wider">
                  {code}
                </code>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={copyBackupCodes} className="w-full">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-primary" />
              Copied to clipboard
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy All Codes
            </>
          )}
        </Button>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={backupAcknowledged}
              onChange={(e) => setBackupAcknowledged(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-4 w-4 rounded border border-border bg-background transition-colors peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2" />
            <Check className="absolute top-0.5 left-0.5 h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
            I have saved these backup codes in a secure location.
          </span>
        </label>

        <Button
          onClick={() => setStep("confirm")}
          className="w-full"
          disabled={!backupAcknowledged}
        >
          Continue
        </Button>
      </div>
    );
  }

  // step === "confirm"
  return (
    <div className="space-y-6">
      <StepIndicator current="confirm" />

      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Step 3
        </div>
        <h3 className="font-display text-lg font-bold tracking-tight">
          Verify Setup
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Enter the 6-digit code from your authenticator to complete setup.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} className="space-y-4">
        <div>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="------"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.4em] font-mono h-14 border-2 focus:border-primary"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Code refreshes every 30 seconds
          </p>
        </div>

        <Button
          type="submit"
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
      </form>
    </div>
  );
}
