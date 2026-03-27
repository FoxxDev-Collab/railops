import { Role } from "@prisma/client";
import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      emailVerified: Date | null;
      impersonatingFrom?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    emailVerified: Date | null;
    impersonatingFrom?: string;
    impersonatingFromRole?: string;
  }
}
