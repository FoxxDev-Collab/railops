"use client";

import { useState } from "react";
import { resendVerification } from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export function CheckEmailForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleResend() {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    const result = await resendVerification(email);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.success);
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t receive the email? Enter your address to resend.
      </p>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button
        onClick={handleResend}
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Sending..." : "Resend Verification Email"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
