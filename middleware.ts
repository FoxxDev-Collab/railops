import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const emailVerified = req.auth?.user?.emailVerified;

  const pathname = nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isVerificationRoute =
    pathname === "/auth/verify" || pathname === "/auth/check-email";

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
  matcher: ["/((?!api/stripe|api|_next/static|_next/image|favicon.ico).*)"],
};
