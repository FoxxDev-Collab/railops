import { db } from "@/lib/db";
import { DEFAULT_ROLE_PERMISSIONS } from "./permissions";

/**
 * Create the four default roles (Dispatcher, Yardmaster, Conductor, Viewer)
 * with their default permissions for a new layout.
 * Safe to call multiple times — skips if roles already exist.
 */
export async function seedDefaultRoles(layoutId: string) {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await db.role.findUnique({
      where: { layoutId_name: { layoutId, name: roleName } },
    });
    if (existing) continue;

    await db.role.create({
      data: {
        name: roleName,
        isDefault: true,
        layoutId,
        permissions: {
          create: permissions.map((p) => ({
            section: p.section,
            canView: p.canView,
            canEdit: p.canEdit,
          })),
        },
      },
    });
  }
}
