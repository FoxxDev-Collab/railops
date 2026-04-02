"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function getAdminNotes(userId: string) {
  await requireAdmin();

  return db.adminNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAdminNote(userId: string, content: string) {
  const session = await requireAdmin();

  const validated = noteSchema.safeParse({ content });
  if (!validated.success) return { error: "Content is required" };

  const note = await db.adminNote.create({
    data: {
      userId,
      adminId: session.user.id,
      content: validated.data.content,
    },
  });

  await logAudit({
    action: "admin_note.create",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "AdminNote",
    entityId: note.id,
    metadata: { userId },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true, note };
}

export async function updateAdminNote(noteId: string, content: string) {
  const session = await requireAdmin();

  const validated = noteSchema.safeParse({ content });
  if (!validated.success) return { error: "Content is required" };

  const existing = await db.adminNote.findUnique({ where: { id: noteId } });
  if (!existing) return { error: "Note not found" };
  if (existing.adminId !== session.user.id) return { error: "Can only edit your own notes" };

  const note = await db.adminNote.update({
    where: { id: noteId },
    data: { content: validated.data.content },
  });

  revalidatePath(`/admin/users/${existing.userId}`);
  return { success: true, note };
}

export async function deleteAdminNote(noteId: string) {
  const session = await requireAdmin();

  const existing = await db.adminNote.findUnique({ where: { id: noteId } });
  if (!existing) return { error: "Note not found" };
  if (existing.adminId !== session.user.id) return { error: "Can only delete your own notes" };

  await db.adminNote.delete({ where: { id: noteId } });

  await logAudit({
    action: "admin_note.delete",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "AdminNote",
    entityId: noteId,
    metadata: { userId: existing.userId },
  });

  revalidatePath(`/admin/users/${existing.userId}`);
  return { success: true };
}
