import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserRole as Role } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/db/user";

// Note: auth.config.ts is the edge-safe config used by middleware only.
// This file defines the full provider config with authorize() for Node.js runtime.

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: { strategy: "jwt" },
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

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        // Track last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

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
