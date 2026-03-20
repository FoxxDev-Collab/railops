"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { generateToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(2).optional(),
});

export async function signup(values: z.infer<typeof signupSchema>) {
  const validatedFields = signupSchema.safeParse(values);

  if (!validatedFields.success) {
    const firstError = validatedFields.error.issues[0]?.message;
    return { error: firstError || "Invalid fields" };
  }

  const { email, password, name } = validatedFields.data;

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  // Generate verification token and send email
  const token = await generateToken(email, "EMAIL_VERIFICATION");
  await sendVerificationEmail(email, token);

  return { success: "Verification email sent! Check your inbox." };
}

export async function login(values: { email: string; password: string }) {
  try {
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    const user = await db.user.findUnique({
      where: { email: values.email },
      select: { role: true, emailVerified: true },
    });

    return {
      success: true,
      role: user?.role,
      emailVerified: !!user?.emailVerified,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }
}
