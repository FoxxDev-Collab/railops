import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-safe auth config — NO Prisma imports.
// The Credentials provider is declared here for JWT cookie shape,
// but authorize() lives in auth.ts where Prisma is available.
export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
  ],
} satisfies NextAuthConfig;
