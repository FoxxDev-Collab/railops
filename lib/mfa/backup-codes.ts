import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const CODE_COUNT = 8;

/**
 * Generate 8 random backup codes in xxxx-xxxx format.
 * Returns both the plaintext codes (to show the user once) and
 * their bcrypt hashes (to store in DB).
 */
export async function generateBackupCodes(): Promise<{
  plaintextCodes: string[];
  hashedCodes: string[];
}> {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < CODE_COUNT; i++) {
    const bytes = randomBytes(4);
    const hex = bytes.toString("hex");
    const code = `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    plaintextCodes.push(code);
    hashedCodes.push(await bcrypt.hash(code, 10));
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Verify a backup code against a list of hashed codes.
 * Returns the index of the matched code, or -1 if none match.
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  const normalized = code.trim().toLowerCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) {
      return i;
    }
  }

  return -1;
}
