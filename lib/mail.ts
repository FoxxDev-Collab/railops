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
  return (await getSetting("smtp.from")) || "Railroad Ops <noreply@railroadops.com>";
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
    subject: "Verify your Railroad Ops account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to Railroad Ops</h2>
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
    subject: "Reset your Railroad Ops password",
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

export async function sendCrewInviteEmail(
  email: string,
  token: string,
  railroadName: string,
  roleName: string,
  inviterName: string | null
) {
  const [transporter, fromEmail, appUrl] = await Promise.all([
    getTransporter(),
    getFromEmail(),
    getAppUrl(),
  ]);

  const acceptUrl = `${appUrl}/invite/accept/${token}`;
  const invitedBy = inviterName || "A railroad owner";

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `You're invited to join ${railroadName} on Railroad Ops`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Join ${railroadName}</h2>
        <p>${invitedBy} has invited you to join <strong>${railroadName}</strong> as a <strong>${roleName}</strong>.</p>
        <p>
          <a href="${acceptUrl}"
             style="display: inline-block; padding: 12px 24px; background: #171717; color: #fff; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This invitation expires in 7 days. If you don't have a Railroad Ops account, you'll be able to create one.
        </p>
      </div>
    `,
  });
}

export async function sendCrewRoleChangedEmail(
  email: string,
  railroadName: string,
  newRoleName: string
) {
  const [transporter, fromEmail] = await Promise.all([
    getTransporter(),
    getFromEmail(),
  ]);

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Your role on ${railroadName} has changed`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Role Updated</h2>
        <p>Your role on <strong>${railroadName}</strong> has been changed to <strong>${newRoleName}</strong>.</p>
        <p style="color: #666; font-size: 14px;">Your permissions have been updated accordingly.</p>
      </div>
    `,
  });
}

export async function sendCrewRemovedEmail(
  email: string,
  railroadName: string
) {
  const [transporter, fromEmail] = await Promise.all([
    getTransporter(),
    getFromEmail(),
  ]);

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `You've been removed from ${railroadName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Access Removed</h2>
        <p>You no longer have access to <strong>${railroadName}</strong> on Railroad Ops.</p>
        <p style="color: #666; font-size: 14px;">If you believe this was a mistake, contact the railroad owner.</p>
      </div>
    `,
  });
}
