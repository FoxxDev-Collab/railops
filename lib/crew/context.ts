import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  type CrewSection,
  type PermissionMap,
  OWNER_PERMISSIONS,
  resolvePermissions,
} from "./permissions";

export interface CrewContext {
  userId: string;
  layoutId: string;
  isOwner: boolean;
  permissions: PermissionMap;
  role?: {
    id: string;
    name: string;
  };
}

/**
 * Get the current user's relationship to a railroad.
 * Returns null if the user has no access (not owner, not active crew).
 */
export async function getCrewContext(
  layoutId: string
): Promise<CrewContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Check ownership first
  const layout = await db.layout.findFirst({
    where: { id: layoutId, userId },
    select: { id: true },
  });

  if (layout) {
    return {
      userId,
      layoutId,
      isOwner: true,
      permissions: OWNER_PERMISSIONS,
    };
  }

  // Check active crew membership
  const membership = await db.crewMember.findUnique({
    where: { userId_layoutId: { userId, layoutId } },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  if (
    !membership ||
    !membership.acceptedAt ||
    membership.removedAt
  ) {
    return null;
  }

  return {
    userId,
    layoutId,
    isOwner: false,
    permissions: resolvePermissions(membership.role.permissions),
    role: {
      id: membership.role.id,
      name: membership.role.name,
    },
  };
}

/**
 * Guard for server actions. Throws if the user lacks the required permission.
 */
export async function requirePermission(
  layoutId: string,
  section: CrewSection,
  action: "view" | "edit"
): Promise<CrewContext> {
  const ctx = await getCrewContext(layoutId);

  if (!ctx) {
    throw new Error("You do not have access to this railroad");
  }

  const perm = ctx.permissions[section];
  if (!perm) {
    throw new Error("Permission denied");
  }

  if (action === "view" && !perm.canView) {
    throw new Error("You do not have permission to view this section");
  }

  if (action === "edit" && !perm.canEdit) {
    throw new Error("You do not have permission to edit this section");
  }

  return ctx;
}

/**
 * Check if a user has any access to a railroad (owner or active crew).
 */
export async function hasRailroadAccess(
  userId: string,
  layoutId: string
): Promise<boolean> {
  const isOwner = await db.layout.count({
    where: { id: layoutId, userId },
  });
  if (isOwner > 0) return true;

  const membership = await db.crewMember.findUnique({
    where: { userId_layoutId: { userId, layoutId } },
    select: { acceptedAt: true, removedAt: true },
  });

  return !!membership?.acceptedAt && !membership?.removedAt;
}
