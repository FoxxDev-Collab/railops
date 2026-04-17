# Branding Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all product branding from "Model Rail Ops" / "modelrailops" / "RailOps" to "Railroad Ops" / "railroadops" to match the production domain railroadops.com.

**Architecture:** Pure string replacement across UI text, email templates, config, and internal references. One static asset rename. No logic changes.

**Tech Stack:** Next.js, TypeScript — text edits only.

---

### Task 1: Rename static asset

**Files:**
- Rename: `public/modelrailops-logo.png` → `public/railroadops-logo.png`

- [ ] **Step 1: Rename the logo file**

```bash
cd "D:/Dev Projects/railops"
git mv public/modelrailops-logo.png public/railroadops-logo.png
```

- [ ] **Step 2: Commit**

```bash
git add public/
git commit -m "chore: rename logo file to railroadops-logo.png"
```

---

### Task 2: Update landing page components

**Files:**
- Modify: `components/landing/landing-header.tsx`
- Modify: `components/landing/landing-footer.tsx`

- [ ] **Step 1: Update landing-header.tsx**

Replace all branding references:

```tsx
// Line 14: src="/modelrailops-logo.png" → src="/railroadops-logo.png"
// Line 15: alt="Model Rail Ops" → alt="Railroad Ops"
// Line 23: Model Rail Ops → Railroad Ops
// Line 26: modelrailops.com → railroadops.com
```

Exact replacements:
- `src="/modelrailops-logo.png"` → `src="/railroadops-logo.png"`
- `alt="Model Rail Ops"` → `alt="Railroad Ops"`
- `Model Rail Ops` (line 23 text content) → `Railroad Ops`
- `modelrailops.com` → `railroadops.com`

- [ ] **Step 2: Update landing-footer.tsx**

```tsx
// Line 11: src="/modelrailops-logo.png" → src="/railroadops-logo.png"
// Line 12: alt="Model Rail Ops" → alt="Railroad Ops"
// Line 18: Model Rail Ops → Railroad Ops
// Line 36: Model Rail Ops → Railroad Ops
```

Exact replacements:
- `src="/modelrailops-logo.png"` → `src="/railroadops-logo.png"`
- `alt="Model Rail Ops"` → `alt="Railroad Ops"`
- `Model Rail Ops` (line 18 span text) → `Railroad Ops`
- `Model Rail Ops. Keeping the` → `Railroad Ops. Keeping the`

- [ ] **Step 3: Commit**

```bash
git add components/landing/
git commit -m "chore: rebrand landing header and footer to Railroad Ops"
```

---

### Task 3: Update app sidebar

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Update sidebar branding**

```tsx
// Line 174: src="/modelrailops-logo.png" → src="/railroadops-logo.png"
// Line 175: alt="Model Rail Ops" → alt="Railroad Ops"
// Line 181: Model Rail Ops → Railroad Ops
```

Exact replacements:
- `src="/modelrailops-logo.png"` → `src="/railroadops-logo.png"`
- `alt="Model Rail Ops"` → `alt="Railroad Ops"`
- `<h2 className="font-display text-base font-bold leading-tight">Model Rail Ops</h2>` → `<h2 className="font-display text-base font-bold leading-tight">Railroad Ops</h2>`

- [ ] **Step 2: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "chore: rebrand app sidebar to Railroad Ops"
```

---

### Task 4: Update root layout and landing page

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Update app/layout.tsx metadata**

```tsx
// Line 20
title: "Model Rail Ops - Model Railroad Operations Management",
// →
title: "Railroad Ops - Model Railroad Operations Management",
```

- [ ] **Step 2: Update app/page.tsx**

```tsx
// Line 104: "Model Rail Ops creates four-panel waybills..." → "Railroad Ops creates four-panel waybills..."
// Line 158: "Model Rail Ops replaces spreadsheets..." → "Railroad Ops replaces spreadsheets..."
// Line 381: src="/modelrailops-logo.png" → src="/railroadops-logo.png"
// Line 382: alt="Model Rail Ops" → alt="Railroad Ops"
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "chore: rebrand root layout and landing page to Railroad Ops"
```

---

### Task 5: Update features and pricing pages

**Files:**
- Modify: `app/features/page.tsx`
- Modify: `app/pricing/page.tsx`

- [ ] **Step 1: Update app/features/page.tsx**

```tsx
// Line 28: title: "Features — Model Rail Ops" → title: "Features — Railroad Ops"
// Line 75: "Model Rail Ops generates four-panel waybills..." → "Railroad Ops generates four-panel waybills..."
// Line 314: "Model Rail Ops creates four-panel waybills..." → "Railroad Ops creates four-panel waybills..."
```

- [ ] **Step 2: Update app/pricing/page.tsx**

```tsx
// Line 18: title: "Pricing — Model Rail Ops" → title: "Pricing — Railroad Ops"
// Line 28: "Can I really use Model Rail Ops for free?" → "Can I really use Railroad Ops for free?"
```

- [ ] **Step 3: Commit**

```bash
git add app/features/page.tsx app/pricing/page.tsx
git commit -m "chore: rebrand features and pricing pages to Railroad Ops"
```

---

### Task 6: Update admin layout and settings

**Files:**
- Modify: `app/(admin)/layout.tsx`
- Modify: `components/admin/settings-form.tsx`
- Modify: `components/admin/admin-login-form.tsx`

- [ ] **Step 1: Update admin layout**

```tsx
// Line 59
<span className="font-semibold">Model Rail Ops Admin</span>
// →
<span className="font-semibold">Railroad Ops Admin</span>
```

- [ ] **Step 2: Update admin settings-form.tsx**

```tsx
// Line 346
placeholder='"Model Rail Ops" <noreply@modelrailops.com>'
// →
placeholder='"Railroad Ops" <noreply@railroadops.com>'
```

```tsx
// Line 389
placeholder="https://modelrailops.com"
// →
placeholder="https://railroadops.com"
```

- [ ] **Step 3: Update admin-login-form.tsx**

```tsx
// Line 63
placeholder="admin@railops.app"
// →
placeholder="admin@railroadops.com"
```

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/layout.tsx components/admin/settings-form.tsx components/admin/admin-login-form.tsx
git commit -m "chore: rebrand admin panel to Railroad Ops"
```

---

### Task 7: Update operations guide page

**Files:**
- Modify: `app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx`

- [ ] **Step 1: Update guide references**

```tsx
// Line 219: "Model Rail Ops" → "Railroad Ops"
// Line 344: "Model Rail Ops generates switch lists" → "Railroad Ops generates switch lists"
```

Use replace_all for `Model Rail Ops` → `Railroad Ops` in this file.

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/dashboard/railroad/[id]/guide/page.tsx"
git commit -m "chore: rebrand operations guide to Railroad Ops"
```

---

### Task 8: Update switch list print view

**Files:**
- Modify: `components/switch-lists/switch-list-view.tsx`

- [ ] **Step 1: Update print header and footer**

```tsx
// Line 82
Model Rail Ops Operations
// →
Railroad Ops Operations

// Line 290
<span>Model Rail Ops · modelrailops.com</span>
// →
<span>Railroad Ops · railroadops.com</span>
```

- [ ] **Step 2: Commit**

```bash
git add components/switch-lists/switch-list-view.tsx
git commit -m "chore: rebrand switch list print view to Railroad Ops"
```

---

### Task 9: Update email templates and mail lib

**Files:**
- Modify: `lib/mail.ts`

- [ ] **Step 1: Update all branding in lib/mail.ts**

Replace all instances (6 total):

```
Line 26: "Model Rail Ops <noreply@modelrailops.com>" → "Railroad Ops <noreply@railroadops.com>"
Line 45: "Verify your Model Rail Ops account" → "Verify your Railroad Ops account"
Line 48: "Welcome to Model Rail Ops" → "Welcome to Railroad Ops"
Line 76: "Reset your Model Rail Ops password" → "Reset your Railroad Ops password"
Line 114: "on Model Rail Ops" → "on Railroad Ops"
Line 126: "Model Rail Ops account" → "Railroad Ops account"
Line 173: "on Model Rail Ops" → "on Railroad Ops"
```

Use replace_all for `Model Rail Ops` → `Railroad Ops` and `modelrailops.com` → `railroadops.com`.

- [ ] **Step 2: Commit**

```bash
git add lib/mail.ts
git commit -m "chore: rebrand email templates to Railroad Ops"
```

---

### Task 10: Update internal lib references

**Files:**
- Modify: `lib/encryption.ts`
- Modify: `lib/mfa/totp.ts`

- [ ] **Step 1: Update encryption salt**

```ts
// lib/encryption.ts line 6
const SALT = "railops-settings-salt";
// →
const SALT = "railroadops-settings-salt";
```

- [ ] **Step 2: Update TOTP issuer**

```ts
// lib/mfa/totp.ts line 5
const ISSUER = "RailOps Admin";
// →
const ISSUER = "Railroad Ops Admin";
```

- [ ] **Step 3: Commit**

```bash
git add lib/encryption.ts lib/mfa/totp.ts
git commit -m "chore: rebrand encryption salt and TOTP issuer to Railroad Ops"
```

---

### Task 11: Update CSV export/import references

**Files:**
- Modify: `components/import-export/csv-trigger-download.ts`
- Modify: `components/import-export/import-panel.tsx`

- [ ] **Step 1: Update csv-trigger-download.ts**

```ts
// Line 15
return `railops-${type}-${date}.csv`;
// →
return `railroadops-${type}-${date}.csv`;
```

- [ ] **Step 2: Update import-panel.tsx**

```tsx
// Line 106
triggerDownload(template, `railops-${resourceType}-template.csv`);
// →
triggerDownload(template, `railroadops-${resourceType}-template.csv`);
```

- [ ] **Step 3: Commit**

```bash
git add components/import-export/
git commit -m "chore: rebrand CSV export filenames to railroadops prefix"
```

---

### Task 12: Update scripts and package.json

**Files:**
- Modify: `package.json`
- Modify: `scripts/create-admin.ts`
- Modify: `scripts/seed-customer.ts`

- [ ] **Step 1: Update package.json name**

```json
"name": "railops"
// →
"name": "railroadops"
```

- [ ] **Step 2: Update create-admin.ts**

```ts
// Line 8
const email = process.env.ADMIN_EMAIL || "admin@railops.com";
// →
const email = process.env.ADMIN_EMAIL || "admin@railroadops.com";
```

- [ ] **Step 3: Update seed-customer.ts**

```ts
// Line 8
const email = "demo@railops.com";
// →
const email = "demo@railroadops.com";
```

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/
git commit -m "chore: rebrand package name and scripts to railroadops"
```

---

### Task 13: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md references**

```
Line 7: "RailOps is a cloud-native..." → "Railroad Ops is a cloud-native..."
Line 101: "RailOps <noreply@railops.app>" → "Railroad Ops <noreply@railroadops.com>"
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: rebrand CLAUDE.md to Railroad Ops"
```

---

### Task 14: Verify — build and grep

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Grep for old branding in source files**

```bash
grep -r "Model Rail Ops\|modelrailops\|RailOps\|railops" --include="*.ts" --include="*.tsx" app/ components/ lib/ scripts/ | grep -v node_modules | grep -v ".claude/worktrees"
```

Expected: Zero hits (excluding `railroadops` matches and domain model terms like `connectingRailroads`).

- [ ] **Step 4: Verify logo file exists**

```bash
ls public/railroadops-logo.png
```

Expected: File exists.

- [ ] **Step 5: Verify old logo file is gone**

```bash
ls public/modelrailops-logo.png 2>&1
```

Expected: No such file.
