import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.EMAIL_FROM || "RailOps <noreply@railops.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: FROM_EMAIL,
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
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM_EMAIL,
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
