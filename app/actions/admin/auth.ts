"use server";

import { adminSignIn, adminSignOut } from "@/lib/admin-auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function adminLogin(values: { email: string; password: string }) {
  try {
    await adminSignIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid credentials" };
    }
    throw error;
  }
}

export async function adminLogout() {
  await adminSignOut({ redirect: false });
  redirect("/admin/auth");
}
