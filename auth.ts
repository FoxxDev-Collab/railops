import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import type { Role } from "@prisma/client";
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
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.emailVerified = (user as { emailVerified: Date | null }).emailVerified;
      }

      // Handle impersonation via cookie
      try {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get("impersonate_target");

        if (impersonateCookie?.value && !token.impersonatingFrom) {
          // Start impersonation: store original admin identity
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
          // Stop impersonation: restore admin identity
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

      return token;
    },
    async session({ session, token }) {
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
