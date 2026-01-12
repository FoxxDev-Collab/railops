import { db } from "./index";

export async function getUserByEmail(email: string) {
  try {
    return await db.user.findUnique({
      where: { email },
    });
  } catch {
    return null;
  }
}

export async function getUserById(id: string) {
  try {
    return await db.user.findUnique({
      where: { id },
    });
  } catch {
    return null;
  }
}
