import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import { encrypt, decrypt } from "./crypto";

const ISSUER = "RailOps Admin";

interface TOTPSetup {
  /** The raw base32 secret (shown to user as manual entry fallback) */
  secret: string;
  /** The encrypted secret to store in DB */
  encryptedSecret: string;
  /** Data URI of the QR code PNG */
  qrDataUri: string;
}

/**
 * Generate a new TOTP secret, encrypt it, and produce a QR code data URI.
 */
export async function generateTOTPSetup(email: string): Promise<TOTPSetup> {
  const secret = new Secret({ size: 20 });

  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUri = totp.toString();
  const qrDataUri = await QRCode.toDataURL(otpauthUri);

  return {
    secret: secret.base32,
    encryptedSecret: encrypt(secret.base32),
    qrDataUri,
  };
}

/**
 * Verify a 6-digit TOTP code against an encrypted secret.
 * Allows a window of 1 period (±30 seconds) for clock drift.
 */
export function verifyTOTPCode(encryptedSecret: string, code: string): boolean {
  const base32 = decrypt(encryptedSecret);

  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
