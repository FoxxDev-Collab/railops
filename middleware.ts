import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

// Use only the edge-safe auth config (no Prisma) for middleware
const { auth } = NextAuth({
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      // Minimal edge-safe JWT callback — only copies user fields on sign-in
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
  "/api/auth", // NextAuth handler
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
  const userRole = req.auth?.user?.role;
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

  // Allow verification routes even when logged in and unverified
  if (isVerificationRoute && isLoggedIn) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
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
