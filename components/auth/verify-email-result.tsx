"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function VerifyEmailResult() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<{
    success?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus({ error: "Missing verification token." });
      return;
    }

    verifyEmail(token).then(setStatus);
  }, [token]);

  if (!status) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      {status.success && (
        <p className="text-sm text-green-600">{status.success}</p>
      )}
      {status.error && (
        <p className="text-sm text-destructive">{status.error}</p>
      )}
      <Button asChild className="w-full">
        <Link href="/auth/login">
          {status.success ? "Sign In" : "Back to Login"}
        </Link>
      </Button>
    </div>
  );
}
