// lib/crew/permissions.ts

export const CREW_SECTIONS = [
  "locations",
  "rolling_stock",
  "trains",
  "waybills",
  "sessions",
  "crew",
] as const;

export type CrewSection = (typeof CREW_SECTIONS)[number];

export const SECTION_LABELS: Record<CrewSection, string> = {
  locations: "Locations",
  rolling_stock: "Rolling Stock",
  trains: "Trains",
  waybills: "Waybills",
  sessions: "Sessions",
  crew: "Crew",
};

export interface PermissionMap {
  [section: string]: { canView: boolean; canEdit: boolean };
}

/** Full access for owners — not stored in DB, constructed at runtime */
export const OWNER_PERMISSIONS: PermissionMap = Object.fromEntries(
  CREW_SECTIONS.map((s) => [s, { canView: true, canEdit: true }])
);

/** Default permission configs for the four seeded roles */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  { section: CrewSection; canView: boolean; canEdit: boolean }[]
> = {
  Dispatcher: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: true,
  })),
  Yardmaster: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: s === "locations" || s === "rolling_stock" || s === "waybills" || s === "sessions",
  })),
  Conductor: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: s === "rolling_stock" || s === "sessions",
  })),
  Viewer: CREW_SECTIONS.map((s) => ({
    section: s,
    canView: true,
    canEdit: false,
  })),
};

export const DEFAULT_ROLE_NAMES = Object.keys(DEFAULT_ROLE_PERMISSIONS);

/**
 * Resolve a flat array of RolePermission records into a PermissionMap.
 * Missing sections default to no access.
 */
export function resolvePermissions(
  permissions: { section: string; canView: boolean; canEdit: boolean }[]
): PermissionMap {
  const map: PermissionMap = {};
  for (const s of CREW_SECTIONS) {
    map[s] = { canView: false, canEdit: false };
  }
  for (const p of permissions) {
    map[p.section] = { canView: p.canView, canEdit: p.canEdit };
  }
  return map;
}
