import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import type { UserRole as Role } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign-in: populate token from the user object returned by authorize()
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.emailVerified = (user as { emailVerified: Date | null }).emailVerified;

        // Store initial session version
        const dbUser = await db.user.findUnique({
          where: { id: user.id as string },
          select: { sessionVersion: true },
        });
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
      }

      // Refresh session data from DB on explicit update trigger
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { sessionVersion: true, role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.sessionVersion = dbUser.sessionVersion;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.invalid) {
        session.user = undefined as unknown as typeof session.user;
        return session;
      }

      // Verify session is still valid on each session access (runs in Node.js, not edge)
      if (token.id && !token.impersonatingFrom) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { sessionVersion: true, role: true },
        });

        if (!dbUser) {
          session.user = undefined as unknown as typeof session.user;
          return session;
        }

        if (dbUser.sessionVersion !== token.sessionVersion) {
          token.role = dbUser.role;
          token.sessionVersion = dbUser.sessionVersion;
        }
      }

      // Handle impersonation via cookie
      try {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get("impersonate_target");

        if (impersonateCookie?.value && !token.impersonatingFrom) {
          const targetUser = await db.user.findUnique({
            where: { id: impersonateCookie.value },
            select: { id: true, role: true, email: true, name: true, emailVerified: true },
          });

          if (targetUser && token.role === "ADMIN") {
            token.impersonatingFrom = token.id as string;
            token.impersonatingFromRole = "ADMIN";
            token.id = targetUser.id;
            token.role = targetUser.role;
            token.email = targetUser.email;
            token.name = targetUser.name;
            token.emailVerified = targetUser.emailVerified;
          }
        } else if (!impersonateCookie?.value && token.impersonatingFrom) {
          const adminUser = await db.user.findUnique({
            where: { id: token.impersonatingFrom as string },
            select: { id: true, role: true, email: true, name: true, emailVerified: true },
          });

          if (adminUser) {
            token.id = adminUser.id;
            token.role = adminUser.role;
            token.email = adminUser.email;
            token.name = adminUser.name;
            token.emailVerified = adminUser.emailVerified;
          }
          delete token.impersonatingFrom;
          delete token.impersonatingFromRole;
        }
      } catch {
        // cookies() may not be available in all contexts
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.emailVerified = token.emailVerified as Date | null;
        if (token.impersonatingFrom) {
          session.user.impersonatingFrom = token.impersonatingFrom as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});
