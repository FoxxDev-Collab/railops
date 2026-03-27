"use client";

import { createContext, useContext } from "react";
import type { PermissionMap } from "@/lib/crew/permissions";

interface PermissionsContextValue {
  isOwner: boolean;
  permissions: PermissionMap;
  roleName: string | null;
}

export const PermissionsContext = createContext<PermissionsContextValue>({
  isOwner: true,
  permissions: {},
  roleName: null,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function canView(permissions: PermissionMap, section: string): boolean {
  return permissions[section]?.canView ?? false;
}

export function canEdit(permissions: PermissionMap, section: string): boolean {
  return permissions[section]?.canEdit ?? false;
}
