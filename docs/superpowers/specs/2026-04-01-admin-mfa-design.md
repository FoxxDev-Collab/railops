# Admin TOTP MFA with Backup Codes

## Overview

Add TOTP-based MFA with backup codes for admin accounts only. Regular users are unaffected. MFA is forced on first admin login if not yet configured, and manageable via admin settings afterward.

## Flows

### First admin login (MFA not set up)

1. Admin enters email/password on `/admin/auth` - password verified via existing `adminSignIn`
2. Password success sets a temporary `mfaPending` flag in the admin JWT (not `mfaVerified`)
3. Admin layout detects `mfaPending` + `!mfaEnabled` on User - redirects to `/admin/mfa/setup`
4. Setup page generates TOTP secret, displays QR code and 8 backup codes
5. Admin scans QR, enters a TOTP code to confirm the secret works
6. Server action stores encrypted secret + hashed backup codes, sets `mfaEnabled: true`
7. Session updated with `mfaVerified: true`, admin lands on `/admin`

### Subsequent admin logins (MFA active)

1. Admin enters email/password - password verified
2. JWT gets `mfaPending: true` (not yet `mfaVerified`)
3. Admin layout detects `mfaPending` + `mfaEnabled` - redirects to `/admin/mfa/verify`
4. Admin enters 6-digit TOTP code OR a backup code
5. Verified - session updated with `mfaVerified: true`, redirect to `/admin`

### Settings (`/admin/settings/mfa`)

- View MFA status (enabled/disabled, backup codes remaining)
- Regenerate backup codes (shows new set of 8, invalidates old)
- Disable MFA (requires current TOTP code)
- Re-enable MFA (full setup flow again)

## Data Model

Add to User model in `prisma/schema.prisma`:

```prisma
mfaSecret          String?
mfaEnabled         Boolean  @default(false)
mfaBackupCodes     String?  // JSON array of bcrypt-hashed codes
mfaBackupCodesUsed Int      @default(0)
```

## Architecture

### Dependencies

- `otpauth` - TOTP generation and verification
- `qrcode` - QR code generation (data URI)
- No native dependencies required

### TOTP Secret Encryption

- AES-256-GCM using `AUTH_SECRET` environment variable as key material
- Encrypt before storing in DB, decrypt on verification
- Utility functions in `lib/mfa/crypto.ts`

### Backup Codes

- 8 codes in `xxxx-xxxx` format (alphanumeric, lowercase)
- Each code bcrypt-hashed individually before storage
- Stored as JSON array in `mfaBackupCodes`
- Each code is single-use: removed from array after successful use
- `mfaBackupCodesUsed` counter tracks total used for admin visibility

### MFA Verification (two-step auth)

MFA verification is separate from NextAuth's `authorize()`. The flow:

1. `authorize()` validates email/password only
2. Admin JWT callback sets `mfaPending: true` on initial sign-in
3. Admin layout checks `mfaPending` and redirects to setup or verify page
4. Server action `verifyMfaCode` checks TOTP or backup code
5. On success, updates the JWT with `mfaVerified: true` via `update()` trigger

### Session/JWT Changes

Add to admin JWT token:
- `mfaPending: boolean` - set after password auth, cleared after MFA verify
- `mfaVerified: boolean` - set after successful MFA verification

Admin layout gate logic:
```
if (!session) -> redirect to /admin/auth
if (role !== ADMIN) -> redirect to /dashboard
if (mfaPending && !user.mfaEnabled) -> redirect to /admin/mfa/setup
if (mfaPending && user.mfaEnabled && !mfaVerified) -> redirect to /admin/mfa/verify
```

### Rate Limiting

- MFA verify endpoint: 5 attempts per 15 minutes per IP
- MFA setup confirmation: 5 attempts per 15 minutes per IP
- Uses existing `lib/rate-limit.ts`

### File Structure

```
lib/mfa/
  crypto.ts          - AES-256-GCM encrypt/decrypt for TOTP secret
  totp.ts            - TOTP generation, verification, QR URI
  backup-codes.ts    - Generate, hash, verify backup codes

app/actions/admin/
  mfa.ts             - Server actions: setupMfa, verifyMfaCode, regenerateBackupCodes, disableMfa

app/(admin-auth)/admin/mfa/
  setup/page.tsx     - QR code display, backup codes, confirmation form
  verify/page.tsx    - TOTP / backup code entry form

app/(admin)/admin/settings/
  mfa/page.tsx       - MFA management (status, regenerate, disable)

components/admin/
  mfa-setup-form.tsx    - Setup flow component
  mfa-verify-form.tsx   - Verification form component
  mfa-settings.tsx      - Settings management component
```

### Security Considerations

- TOTP secret encrypted at rest (AES-256-GCM)
- Backup codes bcrypt-hashed (not stored in plaintext)
- Backup codes shown exactly once during setup
- MFA verify rate-limited to prevent brute force
- Disabling MFA requires a valid TOTP code
- MFA pages under `(admin-auth)` route group (no admin session required, only mfaPending)
