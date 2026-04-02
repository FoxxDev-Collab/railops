import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserRole as Role } from "@prisma/client";
import { getUserByEmail } from "@/lib/db/user";
import { db } from "@/lib/db";

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
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.email = user.email;
        token.name = user.name;
        // Password verified — MFA step is pending
        token.mfaPending = true;
        token.mfaVerified = false;
      }

      // Handle MFA verification update
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { mfaEnabled: true },
        });
        if (dbUser?.mfaEnabled) {
          token.mfaPending = false;
          token.mfaVerified = true;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session as Record<string, unknown>).mfaPending = token.mfaPending as boolean;
        (session as Record<string, unknown>).mfaVerified = token.mfaVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/auth",
    error: "/admin/auth",
  },
});
