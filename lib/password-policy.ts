import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A–Z)",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a–z)",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "digit",
    label: "One number (0–9)",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "One special character (!@#$%^&* etc.)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export interface PasswordRuleResult {
  id: string;
  label: string;
  passed: boolean;
}

export function evaluatePassword(password: string): {
  valid: boolean;
  rules: PasswordRuleResult[];
} {
  const rules = PASSWORD_RULES.map((r) => ({
    id: r.id,
    label: r.label,
    passed: r.test(password),
  }));
  return { valid: rules.every((r) => r.passed), rules };
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((p) => /[A-Z]/.test(p), {
    message: "Must contain an uppercase letter",
  })
  .refine((p) => /[a-z]/.test(p), {
    message: "Must contain a lowercase letter",
  })
  .refine((p) => /[0-9]/.test(p), { message: "Must contain a number" })
  .refine((p) => /[^A-Za-z0-9]/.test(p), {
    message: "Must contain a special character",
  });
