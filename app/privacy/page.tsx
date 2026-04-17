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
