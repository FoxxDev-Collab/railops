import { randomUUID, createHash } from "crypto";
import { db } from "@/lib/db";
import { TokenType } from "@prisma/client";

const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 60 * 60 * 1000, // 1 hour
  PASSWORD_RESET: 15 * 60 * 1000, // 15 minutes
} as const;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function generateToken(
  email: string,
  type: TokenType
): Promise<string> {
  const rawToken = randomUUID();
  const hashedToken = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_EXPIRY[type]);

  // Delete any existing token for this email+type
  await db.verificationToken.deleteMany({
    where: { email, type },
  });

  await db.verificationToken.create({
    data: {
      token: hashedToken,
      email,
      type,
      expires,
    },
  });

  return rawToken;
}

export async function verifyToken(
  rawToken: string,
  type: TokenType
): Promise<{ email: string } | null> {
  const hashedToken = hashToken(rawToken);

  const token = await db.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!token || token.type !== type || token.expires < new Date()) {
    // Clean up expired token if it exists
    if (token) {
      await db.verificationToken.delete({ where: { id: token.id } });
    }
    return null;
  }

  // Single-use: delete after verification
  await db.verificationToken.delete({ where: { id: token.id } });

  return { email: token.email };
}

export async function hasRecentToken(
  email: string,
  type: TokenType,
  cooldownMs = 60_000
): Promise<boolean> {
  const recent = await db.verificationToken.findFirst({
    where: {
      email,
      type,
      createdAt: { gt: new Date(Date.now() - cooldownMs) },
    },
  });
  return !!recent;
}
