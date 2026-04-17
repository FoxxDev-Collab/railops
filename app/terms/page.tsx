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
