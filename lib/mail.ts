import nodemailer from "nodemailer";
import { getSetting } from "@/lib/settings";

/**
 * Creates a transporter using DB settings (with env fallback).
 * Transporter is created per-call since admin can change SMTP config.
 */
async function getTransporter() {
  const [host, port, user, pass, secure] = await Promise.all([
    getSetting("smtp.host"),
    getSetting("smtp.port"),
    getSetting("smtp.user"),
    getSetting("smtp.password"),
    getSetting("smtp.secure"),
  ]);

  return nodemailer.createTransport({
    host: host || undefined,
    port: Number(port) || 587,
    secure: secure === "true",
    auth: user && pass ? { user, pass } : undefined,
  });
}

async function getFromEmail() {
  return (await getSetting("smtp.from")) || "RailOps <noreply@railops.app>";
}

async function getAppUrl() {
  return (await getSetting("app.url")) || "http://localhost:3000";
}

export async function sendVerificationEmail(email: string, token: string) {
  const [transporter, fromEmail, appUrl] = await Promise.all([
    getTransporter(),
    getFromEmail(),
    getAppUrl(),
  ]);

  const verifyUrl = `${appUrl}/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: "Verify your RailOps account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to RailOps</h2>
        <p>Click the link below to verify your email and activate your account:</p>
        <p>
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background: #171717; color: #fff; text-decoration: none; border-radius: 6px;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const [transporter, fromEmail, appUrl] = await Promise.all([
    getTransporter(),
    getFromEmail(),
    getAppUrl(),
  ]);

  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: "Reset your RailOps password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Click the link below to set a new password:</p>
        <p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background: #171717; color: #fff; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 15 minutes. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}
