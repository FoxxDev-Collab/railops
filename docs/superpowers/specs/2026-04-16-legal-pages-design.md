# Legal Pages: Terms of Service & Privacy Policy

## Summary

Add Terms of Service and Privacy Policy pages to Railroad Ops. Required before accepting payments via Stripe. Static server-rendered pages with hardcoded legal text.

## Operator

- **Name:** Jeremiah Price (sole proprietor, no business entity)
- **Contact:** support@railroadops.com
- **Governing law:** State of Colorado, USA
- **Effective date:** April 16, 2026

## Routes

- `app/(legal)/terms/page.tsx` — Terms of Service
- `app/(legal)/privacy/page.tsx` — Privacy Policy
- `app/(legal)/layout.tsx` — Shared layout using LandingHeader + LandingFooter (no sidebar, no auth required)

## Links

Add to existing components:

- **Landing footer** (`components/landing/landing-footer.tsx`) — Add "Terms" and "Privacy" links in the nav section
- **Signup form** (`components/auth/signup-form.tsx`) — Add text below the submit button: "By signing up, you agree to our [Terms of Service](/terms) and [Privacy Policy](/privacy)."

## Terms of Service Content

### 1. Agreement to Terms
By accessing or using Railroad Ops ("the Service"), operated by Jeremiah Price ("we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

### 2. Description of Service
Railroad Ops is a web-based platform for model railroad operations management. The Service allows users to create and manage railroad layouts, rolling stock, waybills, operating sessions, and related operations data.

### 3. Accounts
- You must provide accurate information when creating an account.
- You are responsible for maintaining the security of your account credentials.
- You must be at least 13 years old to use the Service.
- One person per account. Shared accounts are not permitted.

### 4. Free and Paid Plans
- The Free tier provides limited access at no cost. No credit card is required.
- The Pro tier is billed monthly through Stripe. You may cancel at any time.
- If you cancel a paid plan, you retain access through the end of the billing period, then revert to Free tier limits.
- We reserve the right to change pricing with 30 days notice to existing subscribers.

### 5. User Content
- You retain ownership of all data you create in the Service (layouts, rolling stock, waybills, etc.).
- We do not claim intellectual property rights over your content.
- You grant us a limited license to store, process, and display your content solely to provide the Service.
- You may export your data at any time using the CSV export feature.

### 6. Acceptable Use
You agree not to:
- Use the Service for any unlawful purpose.
- Attempt to gain unauthorized access to the Service or its systems.
- Interfere with or disrupt the Service.
- Upload malicious code or content.
- Create multiple free accounts to circumvent tier limits.

### 7. Service Availability
- The Service is provided "as is" and "as available."
- We do not guarantee uninterrupted or error-free operation.
- We may modify, suspend, or discontinue the Service at any time with reasonable notice.

### 8. Termination
- You may delete your account at any time.
- We may terminate your account for violation of these Terms.
- Upon termination, your data will be permanently deleted.

### 9. Limitation of Liability
To the maximum extent permitted by law, Jeremiah Price shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, or goodwill. Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.

### 10. Disclaimer of Warranties
The Service is provided without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.

### 11. Changes to Terms
We may update these Terms at any time. We will notify you of material changes by email. Continued use of the Service after changes constitutes acceptance.

### 12. Governing Law
These Terms are governed by the laws of the State of Colorado, without regard to its conflict of law provisions.

### 13. Contact
For questions about these Terms, contact us at support@railroadops.com.

## Privacy Policy Content

### 1. Introduction
Railroad Ops ("the Service"), operated by Jeremiah Price ("we", "us", "our"), respects your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.

### 2. Information We Collect

**Account information:** Email address and password (hashed, never stored in plain text). Name if optionally provided.

**Railroad data:** All content you create within the Service — layouts, locations, rolling stock, trains, waybills, operating sessions, and related data.

**Payment information:** If you subscribe to a paid plan, payment is processed by Stripe. We do not store your credit card number. Stripe may collect billing information per their own privacy policy.

**Automatically collected:** IP address and basic request logs for security and abuse prevention. No analytics, tracking pixels, or marketing cookies.

### 3. How We Use Your Information
- To provide and operate the Service.
- To send transactional emails (account verification, password reset, crew invitations).
- To process payments through Stripe.
- To protect against abuse and unauthorized access.

We do not sell, rent, or share your personal information with third parties for marketing purposes.

### 4. Third-Party Services

We use the following third-party services to operate Railroad Ops:

| Service | Purpose | Data shared |
|---------|---------|-------------|
| Stripe | Payment processing | Email, billing info (for paid users only) |
| SMTP2GO | Transactional email delivery | Email address, email content |
| Neon | Database hosting | All account and railroad data (encrypted in transit) |
| Vercel | Application hosting | IP address, request logs |

Each provider has their own privacy policy governing their handling of your data.

### 5. Cookies
We use session cookies only — required for authentication and maintaining your logged-in state. We do not use tracking cookies, analytics cookies, or third-party advertising cookies. No cookie consent banner is required.

### 6. Data Retention
- Your data is retained as long as your account is active.
- If you delete your account, all associated data is permanently deleted.
- Backups may retain data for up to 30 days after deletion.

### 7. Your Rights
- **Access:** You can view all your data within the Service.
- **Export:** You can export your data at any time using the CSV export feature.
- **Deletion:** You can delete your account and all associated data at any time.
- **Correction:** You can update your account information at any time.

### 8. Children's Privacy
The Service is not directed at children under 13. We do not knowingly collect information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it.

### 9. Security
We implement industry-standard security measures including encrypted connections (HTTPS/TLS), hashed passwords (bcrypt), and encrypted sensitive settings (AES-256-GCM). However, no method of transmission or storage is 100% secure.

### 10. Changes to This Policy
We may update this Privacy Policy at any time. We will notify you of material changes by email. The effective date at the top of this page indicates when it was last updated.

### 11. Contact
For questions about this Privacy Policy, contact us at support@railroadops.com.

## UI Design

Both pages use the same layout: LandingHeader at top, LandingFooter at bottom, centered content column with standard prose typography. No special styling needed — clean readable text with section headers.

Metadata for each page:
- Terms: `title: "Terms of Service — Railroad Ops"`, appropriate description
- Privacy: `title: "Privacy Policy — Railroad Ops"`, appropriate description

## Verification

- Both pages render at `/terms` and `/privacy`
- Links work from landing footer
- Signup form shows legal agreement text with working links
- `npm run build` passes
