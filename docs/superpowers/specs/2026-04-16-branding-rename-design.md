# Branding Rename: Model Rail Ops → Railroad Ops

## Summary

Rename all instances of the product brand from "Model Rail Ops" / "modelrailops" / "RailOps" to "Railroad Ops" / "railroadops" to match the production domain railroadops.com. No existing data preservation constraints — everything gets renamed.

## Brand Identity

- **Product name:** Railroad Ops
- **Domain:** railroadops.com
- **Email sender (fallback):** `Railroad Ops <noreply@railroadops.com>`
- **TOTP issuer:** Railroad Ops Admin
- **Package name:** railroadops
- **CSV export prefix:** railroadops-

## Files to Change

### User-facing UI text (`Model Rail Ops` → `Railroad Ops`)

- `app/layout.tsx` — metadata title
- `app/page.tsx` — landing page copy, logo alt text, logo src
- `app/pricing/page.tsx` — metadata title, FAQ copy
- `app/features/page.tsx` — metadata title, feature descriptions
- `app/(admin)/layout.tsx` — admin sidebar brand
- `app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx` — operations guide copy
- `components/landing/landing-header.tsx` — logo, brand text, domain
- `components/landing/landing-footer.tsx` — logo, brand text, copyright
- `components/layout/app-sidebar.tsx` — logo, brand text
- `components/switch-lists/switch-list-view.tsx` — print header/footer
- `components/admin/settings-form.tsx` — placeholder text
- `components/admin/admin-login-form.tsx` — placeholder email

### Internal code references

- `lib/mail.ts` — fallback sender address
- `lib/mfa/totp.ts` — TOTP issuer string
- `lib/encryption.ts` — salt string (`railops-settings-salt` → `railroadops-settings-salt`)
- `components/import-export/csv-trigger-download.ts` — export filename prefix
- `components/import-export/import-panel.tsx` — template filename prefix
- `scripts/seed-customer.ts` — demo email
- `scripts/create-admin.ts` — default admin email

### Config and docs

- `package.json` — name field
- `CLAUDE.md` — project description, email example
- All files in `docs/superpowers/specs/` and `docs/superpowers/plans/` that reference old branding

### Static assets

- `public/modelrailops-logo.png` → `public/railroadops-logo.png` (rename file)
- Update all `src="/modelrailops-logo.png"` references to `src="/railroadops-logo.png"`

## What does NOT change

- Domain model field names (`connectingRailroads`, `railroadName`) — these are railroad industry terms, not branding
- Asset sprite sheet filenames (`railops_freight_cars.svg` etc) — internal asset naming, but these should also be updated for consistency
- `.claude/worktrees/` — ephemeral, not committed
- Crew action email templates that say "Railroad" in context of the user's railroad name (e.g. "join {railroadName} on Railroad Ops")

## Crew email templates

Update brand references in email templates within `app/actions/crew.ts` and `lib/mail.ts`:
- "on RailOps" → "on Railroad Ops"
- Sender fallback updated to railroadops.com

## Verification

After all changes:
1. `npm run build` passes clean
2. `npm run lint` passes
3. Grep for `Model Rail Ops`, `modelrailops`, `RailOps` returns zero hits in app/, components/, lib/ (excluding node_modules, .claude/worktrees)
