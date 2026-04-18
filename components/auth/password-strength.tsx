"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluatePassword } from "@/lib/password-policy";

interface PasswordStrengthProps {
  password: string;
  /** Hide all rules once the password satisfies them. Default: false. */
  hideWhenValid?: boolean;
  className?: string;
}

export function PasswordStrength({
  password,
  hideWhenValid = false,
  className,
}: PasswordStrengthProps) {
  const { valid, rules } = evaluatePassword(password);

  if (hideWhenValid && valid) return null;
  if (!password) {
    return (
      <ul className={cn("space-y-1 text-xs text-muted-foreground", className)}>
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/30" />
            {r.label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("space-y-1 text-xs", className)}>
      {rules.map((r) => (
        <li
          key={r.id}
          className={cn(
            "flex items-center gap-2",
            r.passed ? "text-primary" : "text-muted-foreground"
          )}
        >
          {r.passed ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          )}
          {r.label}
        </li>
      ))}
    </ul>
  );
}
