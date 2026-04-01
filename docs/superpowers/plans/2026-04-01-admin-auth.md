# Admin Authentication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fully independent admin authentication system with its own NextAuth instance, cookie, login page, and session management — completely separate from the regular user auth.

**Architecture:** A second NextAuth instance (`lib/admin-auth.ts`) with a custom `admin-session-token` cookie handles admin authentication. The admin login page at `/admin/auth` calls a dedicated `adminLogin()` server action. Middleware no longer protects `/admin/*` — the admin layout validates sessions server-side via `adminAuth()`.

**Tech Stack:** Next.js 16 App Router, NextAuth.js v5, Prisma, bcryptjs, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-01-admin-auth-design.md`

---

### Task 1: Create admin NextAuth instance

**Files:**
- Create: `lib/admin-auth.ts`

- [ ] **Step 1: Create `lib/admin-auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserRole as Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/db/user";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const {
  handlers: { GET: adminGET, POST: adminPOST },
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "admin-session-token",
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = credentialsSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;
        const user = await getUserByEmail(email);

        if (!user || !user.password) {
          return null;
        }

        // Only allow ADMIN users through admin auth
        if (user.role !== "ADMIN") {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/auth",
    error: "/admin/auth",
  },
});
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `lib/admin-auth.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/admin-auth.ts
git commit -m "feat(admin-auth): add independent NextAuth instance with separate cookie"
```

---

### Task 2: Create admin auth route handler

**Files:**
- Create: `app/api/admin-auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
export { adminGET as GET, adminPOST as POST } from "@/lib/admin-auth";
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin-auth/
git commit -m "feat(admin-auth): add admin auth API route handler"
```

---

### Task 3: Create admin login server action

**Files:**
- Create: `app/actions/admin/auth.ts`

- [ ] **Step 1: Create `app/actions/admin/auth.ts`**

```ts
"use server";

import { adminSignIn, adminSignOut } from "@/lib/admin-auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function adminLogin(values: { email: string; password: string }) {
  try {
    await adminSignIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid credentials" };
    }
    throw error;
  }
}

export async function adminLogout() {
  await adminSignOut({ redirect: false });
  redirect("/admin/auth");
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/admin/auth.ts
git commit -m "feat(admin-auth): add adminLogin and adminLogout server actions"
```

---

### Task 4: Create admin login form component

**Files:**
- Create: `components/admin/admin-login-form.tsx`

- [ ] **Step 1: Create `components/admin/admin-login-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminLogin } from "@/app/actions/admin/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function AdminLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);

    const result = await adminLogin(values);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@railops.app" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/admin-login-form.tsx
git commit -m "feat(admin-auth): add admin login form component"
```

---

### Task 5: Create admin login page and layout

**Files:**
- Create: `app/(admin)/admin/auth/layout.tsx`
- Create: `app/(admin)/admin/auth/page.tsx`

- [ ] **Step 1: Create `app/(admin)/admin/auth/layout.tsx`**

This overrides the admin sidebar layout for the auth page only — minimal centered layout, no sidebar chrome.

```tsx
export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(admin)/admin/auth/page.tsx`**

```tsx
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default async function AdminAuthPage() {
  const session = await adminAuth();

  // Already authenticated as admin — go to admin dashboard
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>Authorized personnel only</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/admin/auth/
git commit -m "feat(admin-auth): add admin login page with dedicated layout"
```

---

### Task 6: Update middleware to ignore admin routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Update `middleware.ts`**

Replace the entire file with:

```ts
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

// Use only the edge-safe auth config (no Prisma) for middleware
const { auth } = NextAuth({
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.emailVerified = (user as { emailVerified: Date | null }).emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
  },
});

// API routes that do NOT require auth (allowlisted)
const PUBLIC_API_ROUTES = [
  "/api/auth",          // NextAuth handler
  "/api/admin-auth",    // Admin NextAuth handler
  "/api/stripe/webhook", // Stripe webhook (has its own signature verification)
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const emailVerified = req.auth?.user?.emailVerified;

  const pathname = nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isInviteRoute = pathname.startsWith("/invite");
  const isVerificationRoute =
    pathname === "/auth/verify" || pathname === "/auth/check-email";

  // Protect API routes by default — only allowlisted routes skip auth
  if (isApiRoute) {
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin routes are fully managed server-side by adminAuth() — skip middleware
  if (isAdminRoute) {
    return NextResponse.next();
  }

  // Allow verification routes even when logged in and unverified
  if (isVerificationRoute && isLoggedIn) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Invite routes are public — let them through
  if (isInviteRoute) {
    return NextResponse.next();
  }

  // Protect dashboard routes — require login + verified email
  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (!emailVerified) {
      return NextResponse.redirect(new URL("/auth/check-email", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "fix(admin-auth): remove admin route protection from middleware, let server handle it"
```

---

### Task 7: Update admin layout to use adminAuth

**Files:**
- Modify: `app/(admin)/layout.tsx`

- [ ] **Step 1: Update `app/(admin)/layout.tsx`**

Replace the entire file with:

```tsx
import { adminAuth } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await adminAuth();

  // Require admin authentication via admin session
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/auth");
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="admin" />
      <SidebarInset>
        <ImpersonationBanner />
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="font-semibold">RailOps Admin</span>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/layout.tsx
git commit -m "feat(admin-auth): switch admin layout to use adminAuth session"
```

---

### Task 8: Update all admin pages to use adminAuth

**Files:**
- Modify: `app/(admin)/admin/page.tsx`
- Modify: `app/(admin)/admin/audit/page.tsx`
- Modify: `app/(admin)/admin/billing/page.tsx`
- Modify: `app/(admin)/admin/system/page.tsx`
- Modify: `app/(admin)/admin/users/page.tsx`
- Modify: `app/(admin)/admin/users/new/page.tsx`
- Modify: `app/(admin)/admin/users/[id]/page.tsx`

- [ ] **Step 1: Update all admin pages**

In every file listed above, make these two changes:

1. Replace `import { auth } from "@/auth"` with `import { adminAuth } from "@/lib/admin-auth"`
2. Replace `const session = await auth()` with `const session = await adminAuth()`

The existing role checks (`if (!session || session.user.role !== "ADMIN")`) can stay — they're defense-in-depth and still valid.

- [ ] **Step 2: Verify no admin pages still import from `@/auth`**

Run: `grep -r "from [\"']@/auth[\"']" app/(admin)/ --include="*.tsx" --include="*.ts"`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/
git commit -m "feat(admin-auth): switch all admin pages to adminAuth"
```

---

### Task 9: Update admin server actions to use adminAuth

**Files:**
- Modify: `app/actions/admin/audit.ts`
- Modify: `app/actions/admin/billing.ts`
- Modify: `app/actions/admin/impersonate.ts`
- Modify: `app/actions/admin/pricing.ts`
- Modify: `app/actions/admin/settings.ts`
- Modify: `app/actions/admin/users.ts`

- [ ] **Step 1: Update all admin server actions**

In every file listed above, make these two changes:

1. Replace `import { auth } from "@/auth"` with `import { adminAuth } from "@/lib/admin-auth"`
2. Replace every `await auth()` with `await adminAuth()`

For files with a `requireAdmin()` helper (like `audit.ts`), the function body becomes:

```ts
async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}
```

For files that inline the check, apply the same pattern.

**Exception: `impersonate.ts`** — this file also imports `signIn` from `@/auth` for the impersonation cookie mechanism. Keep that import. Only change `auth()` → `adminAuth()` and add the `adminAuth` import. The file will import from both `@/auth` and `@/lib/admin-auth`.

- [ ] **Step 2: Verify no admin actions still use `auth()` for session checks**

Run: `grep -n "await auth()" app/actions/admin/ -r`
Expected: No matches (except any non-session usages in `impersonate.ts` if applicable)

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin/
git commit -m "feat(admin-auth): switch all admin server actions to adminAuth"
```

---

### Task 10: Update admin sidebar sign-out

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 1: Update sign-out handler in `components/layout/app-sidebar.tsx`**

Change the `handleSignOut` function (around line 142) from:

```ts
async function handleSignOut() {
  const { signOut } = await import("next-auth/react");
  signOut({ callbackUrl: "/auth/login" });
}
```

To a variant-aware version:

```ts
async function handleSignOut() {
  if (variant === "admin") {
    const { adminLogout } = await import("@/app/actions/admin/auth");
    await adminLogout();
  } else {
    const { signOut } = await import("next-auth/react");
    signOut({ callbackUrl: "/auth/login" });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "feat(admin-auth): use adminLogout for admin sidebar sign-out"
```

---

### Task 11: Build, lint, and verify

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: Clean (0 errors, 0 warnings)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Successful build with no errors

- [ ] **Step 3: Fix any issues found**

If lint or build fails, fix the issues and re-run.

- [ ] **Step 4: Final commit and push**

```bash
git push
```
