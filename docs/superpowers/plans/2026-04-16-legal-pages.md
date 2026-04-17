# Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Terms of Service and Privacy Policy pages required before accepting payments.

**Architecture:** Two static server components at `/terms` and `/privacy` that render hardcoded legal text. Each page imports LandingHeader and LandingFooter directly (matching features/pricing page pattern — no route group layout). Footer and signup form updated with links.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS

---

## File Structure

| File | Responsibility |
|------|---------------|
| `app/terms/page.tsx` (create) | Terms of Service page with metadata and full legal text |
| `app/privacy/page.tsx` (create) | Privacy Policy page with metadata and full legal text |
| `components/landing/landing-footer.tsx` (modify) | Add Terms and Privacy nav links |
| `components/auth/signup-form.tsx` (modify) | Add legal agreement text below submit button |

---

### Task 1: Create Terms of Service page

**Files:**
- Create: `app/terms/page.tsx`

- [ ] **Step 1: Create the terms page**

Create `app/terms/page.tsx` with the following content:

```tsx
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Railroad Ops",
  description:
    "Terms of Service for Railroad Ops, a model railroad operations management platform.",
};

export default function TermsPage() {
  return (
    <>
      <LandingHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Effective date: April 16, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Railroad Ops (&ldquo;the Service&rdquo;), operated by
              Jeremiah Price (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), you agree to be bound by
              these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Railroad Ops is a web-based platform for model railroad operations
              management. The Service allows users to create and manage railroad layouts,
              rolling stock, waybills, operating sessions, and related operations data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Accounts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 13 years old to use the Service.</li>
              <li>One person per account. Shared accounts are not permitted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Free and Paid Plans</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>The Free tier provides limited access at no cost. No credit card is required.</li>
              <li>The Pro tier is billed monthly through Stripe. You may cancel at any time.</li>
              <li>
                If you cancel a paid plan, you retain access through the end of the billing
                period, then revert to Free tier limits.
              </li>
              <li>
                We reserve the right to change pricing with 30 days notice to existing
                subscribers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. User Content</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                You retain ownership of all data you create in the Service (layouts, rolling
                stock, waybills, etc.).
              </li>
              <li>We do not claim intellectual property rights over your content.</li>
              <li>
                You grant us a limited license to store, process, and display your content
                solely to provide the Service.
              </li>
              <li>You may export your data at any time using the CSV export feature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to the Service or its systems.</li>
              <li>Interfere with or disrupt the Service.</li>
              <li>Upload malicious code or content.</li>
              <li>Create multiple free accounts to circumvent tier limits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Service Availability</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
              </li>
              <li>We do not guarantee uninterrupted or error-free operation.</li>
              <li>
                We may modify, suspend, or discontinue the Service at any time with
                reasonable notice.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You may delete your account at any time.</li>
              <li>We may terminate your account for violation of these Terms.</li>
              <li>Upon termination, your data will be permanently deleted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Jeremiah Price shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages, or any
              loss of profits or revenues, whether incurred directly or indirectly, or any
              loss of data, use, or goodwill. Our total liability for any claim arising from
              the Service shall not exceed the amount you paid us in the 12 months preceding
              the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided without warranties of any kind, whether express or
              implied, including but not limited to implied warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms at any time. We will notify you of material changes
              by email. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Colorado, without regard
              to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:support@railroadops.com"
                className="text-primary hover:underline"
              >
                support@railroadops.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
```

- [ ] **Step 2: Verify the page builds**

Run: `npm run build 2>&1 | grep -E "terms|error" | head -5`

Expected: `/terms` appears in route list, no errors.

- [ ] **Step 3: Commit**

```bash
git add app/terms/page.tsx
git commit -m "feat: add Terms of Service page"
```

---

### Task 2: Create Privacy Policy page

**Files:**
- Create: `app/privacy/page.tsx`

- [ ] **Step 1: Create the privacy page**

Create `app/privacy/page.tsx` with the following content:

```tsx
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Railroad Ops",
  description:
    "Privacy Policy for Railroad Ops. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <LandingHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Effective date: April 16, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Railroad Ops (&ldquo;the Service&rdquo;), operated by Jeremiah Price
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), respects your privacy. This Privacy
              Policy explains what information we collect, how we use it, and your rights
              regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-1">Account information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Email address and password (hashed, never stored in plain text). Name if
                  optionally provided.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium mb-1">Railroad data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All content you create within the Service — layouts, locations, rolling
                  stock, trains, waybills, operating sessions, and related data.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium mb-1">Payment information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you subscribe to a paid plan, payment is processed by Stripe. We do not
                  store your credit card number. Stripe may collect billing information per
                  their own privacy policy.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium mb-1">Automatically collected</h3>
                <p className="text-muted-foreground leading-relaxed">
                  IP address and basic request logs for security and abuse prevention. No
                  analytics, tracking pixels, or marketing cookies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and operate the Service.</li>
              <li>
                To send transactional emails (account verification, password reset, crew
                invitations).
              </li>
              <li>To process payments through Stripe.</li>
              <li>To protect against abuse and unauthorized access.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell, rent, or share your personal information with third parties for
              marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the following third-party services to operate Railroad Ops:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Service</th>
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Purpose</th>
                    <th className="text-left py-2 font-medium text-foreground">Data shared</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2 pr-4">Payment processing</td>
                    <td className="py-2">Email, billing info (paid users only)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">SMTP2GO</td>
                    <td className="py-2 pr-4">Transactional email delivery</td>
                    <td className="py-2">Email address, email content</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Neon</td>
                    <td className="py-2 pr-4">Database hosting</td>
                    <td className="py-2">All account and railroad data (encrypted in transit)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">Application hosting</td>
                    <td className="py-2">IP address, request logs</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Each provider has their own privacy policy governing their handling of your
              data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use session cookies only — required for authentication and maintaining your
              logged-in state. We do not use tracking cookies, analytics cookies, or
              third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your data is retained as long as your account is active.</li>
              <li>
                If you delete your account, all associated data is permanently deleted.
              </li>
              <li>Backups may retain data for up to 30 days after deletion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Access:</strong> You can view all your
                data within the Service.
              </li>
              <li>
                <strong className="text-foreground">Export:</strong> You can export your data
                at any time using the CSV export feature.
              </li>
              <li>
                <strong className="text-foreground">Deletion:</strong> You can delete your
                account and all associated data at any time.
              </li>
              <li>
                <strong className="text-foreground">Correction:</strong> You can update your
                account information at any time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed at children under 13. We do not knowingly collect
              information from children under 13. If we become aware that a child under 13
              has provided us with personal information, we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encrypted
              connections (HTTPS/TLS), hashed passwords (bcrypt), and encrypted sensitive
              settings (AES-256-GCM). However, no method of transmission or storage is 100%
              secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy at any time. We will notify you of material
              changes by email. The effective date at the top of this page indicates when it
              was last updated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Privacy Policy, contact us at{" "}
              <a
                href="mailto:support@railroadops.com"
                className="text-primary hover:underline"
              >
                support@railroadops.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
```

- [ ] **Step 2: Verify the page builds**

Run: `npm run build 2>&1 | grep -E "privacy|error" | head -5`

Expected: `/privacy` appears in route list, no errors.

- [ ] **Step 3: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "feat: add Privacy Policy page"
```

---

### Task 3: Add legal links to landing footer

**Files:**
- Modify: `components/landing/landing-footer.tsx`

- [ ] **Step 1: Add Terms and Privacy links to footer nav**

In `components/landing/landing-footer.tsx`, add two links after the existing "Pricing" link inside the `<nav>` element (after line 33):

```tsx
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
```

The nav section should end up with four links: Features, Pricing, Terms, Privacy.

- [ ] **Step 2: Commit**

```bash
git add components/landing/landing-footer.tsx
git commit -m "feat: add legal page links to landing footer"
```

---

### Task 4: Add legal agreement text to signup form

**Files:**
- Modify: `components/auth/signup-form.tsx`

- [ ] **Step 1: Add legal text below submit button**

In `components/auth/signup-form.tsx`, add the following paragraph immediately after the submit `<Button>` (after line 124) and before the existing "Already have an account?" paragraph:

```tsx
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
```

The `Link` import already exists at line 20 of this file.

- [ ] **Step 2: Commit**

```bash
git add components/auth/signup-form.tsx
git commit -m "feat: add legal agreement text to signup form"
```

---

### Task 5: Verify everything

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build completes, `/terms` and `/privacy` appear as static routes (`○`).

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors introduced.

- [ ] **Step 3: Verify routes exist in build output**

```bash
npm run build 2>&1 | grep -E "terms|privacy"
```

Expected: Both `/terms` and `/privacy` appear.
