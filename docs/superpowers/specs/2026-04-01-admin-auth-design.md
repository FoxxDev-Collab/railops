# Admin Authentication System

## Problem

The middleware runs on Vercel's Edge Runtime where Prisma is unavailable. The current auth system uses a single NextAuth instance whose JWT callback queries the database, causing silent failures when middleware tries to validate admin sessions. Admin users log in successfully but get bounced to `/dashboard` because the middleware can't read their role.

## Decision

Create a second, fully independent NextAuth instance dedicated to admin authentication. This sidesteps the edge runtime problem entirely — middleware no longer protects `/admin/*` routes, and admin auth runs exclusively in Node.js server-side.

## Architecture

Two independent NextAuth instances with separate cookies and session helpers:

| Concern | Regular Auth | Admin Auth |
|---|---|---|
| Config | `auth.ts` | `lib/admin-auth.ts` |
| Route handler | `/api/auth/[...nextauth]` | `/api/admin-auth/[...nextauth]` |
| Cookie name | `authjs.session-token` (default) | `admin-session-token` (custom) |
| Login page | `/auth/login` | `/admin/auth` |
| Protected routes | `/dashboard/*` | `/admin/*` |
| Session helper | `auth()` | `adminAuth()` |
| Server action | `login()` | `adminLogin()` |

Sessions are fully independent. An admin can be logged into both the admin panel and the regular app simultaneously. Logging out of one does not affect the other.

## Admin Auth Flow

### Login

1. Admin navigates to `/admin/auth` (no links from the public site — must know the URL).
2. Enters email and password.
3. `adminLogin()` server action validates credentials, verifies the user has `ADMIN` role, calls `adminSignIn()`.
4. On success, redirects server-side to `/admin`.
5. On failure, shows generic "Invalid credentials" — no hints about account existence or role.

### Session Validation

- Admin layout calls `adminAuth()` on every request (Node.js runtime, no edge concerns).
- Checks the `admin-session-token` cookie.
- If no session or role is not ADMIN, redirect to `/admin/auth`.
- Session includes: `id`, `email`, `name`, `role`.

### Logout

- Admin sidebar sign-out button calls `adminSignOut()`.
- Clears only the `admin-session-token` cookie.
- Redirects to `/admin/auth`.
- Does not touch the regular user session.

### Impersonation

Existing impersonation logic stays in the regular `auth.ts`. The admin panel is for system management only — impersonation is initiated from the admin panel but operates within the regular auth session.

## Admin Login Page

**Route:** `app/(admin)/admin/auth/page.tsx`

**Layout:** `app/(admin)/admin/auth/layout.tsx` — overrides the admin sidebar layout with a minimal centered layout. No sidebar, no admin chrome.

**Visual treatment:**
- Same color system as the app but more authoritative and official.
- Shield or lock icon instead of the regular logo.
- Title: "Admin Access" with subtitle "Authorized personnel only".
- Muted, minimal — no marketing copy, no sign-up link, no forgot-password link.
- Single form: email + password + submit.
- No visible link from anywhere in the public app.

**Component:** `components/admin/admin-login-form.tsx` — client component calling `adminLogin()`.

## Middleware Changes

Remove all `/admin/*` protection from middleware. Add `/admin/auth` and `/api/admin-auth` to public/passthrough routes. The admin layout handles its own auth entirely server-side.

## File Changes

### New Files

- `lib/admin-auth.ts` — Second NextAuth instance with custom `admin-session-token` cookie, JWT callback (sets id/role/email on sign-in), session callback (populates session.user).
- `app/api/admin-auth/[...nextauth]/route.ts` — Route handler exporting GET/POST from admin auth.
- `app/actions/admin/auth.ts` — `adminLogin()` (validates credentials + ADMIN role, calls `adminSignIn`) and `adminSignOut()` server actions.
- `components/admin/admin-login-form.tsx` — Client-side admin login form.
- `app/(admin)/admin/auth/layout.tsx` — Minimal centered layout for admin login page.
- `app/(admin)/admin/auth/page.tsx` — Admin login page.

### Modified Files

- `middleware.ts` — Remove `/admin/*` protection, add `/admin/auth` and `/api/admin-auth` to allowed routes.
- `app/(admin)/layout.tsx` — Switch from `auth()` to `adminAuth()`, redirect to `/admin/auth` instead of `/auth/login`.
- `app/(admin)/admin/page.tsx` — Switch from `auth()` to `adminAuth()`.
- `components/layout/app-sidebar.tsx` — Admin sign-out calls `adminSignOut()`.

### Unchanged

- `auth.ts`, `auth.config.ts`, regular login flow, `app/actions/auth.ts` — no modifications.
