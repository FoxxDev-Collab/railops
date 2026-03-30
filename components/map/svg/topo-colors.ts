export const TOPO_TRACK_STYLES = {
  mainline: { strokeWidth: 4, tickSpacing: 20, tickLength: 10, dash: undefined },
  branch: { strokeWidth: 2.5, tickSpacing: 25, tickLength: 8, dash: "8,4" },
  spur: { strokeWidth: 1.5, tickSpacing: 0, tickLength: 0, dash: "4,3" },
} as const;

export const YARD_TRACK_COLORS: Record<string, { light: string; dark: string; label: string }> = {
  ARRIVAL: { light: "#3b6fb5", dark: "#7ab3e0", label: "Arrival" },
  CLASSIFICATION: { light: "#b5873b", dark: "#e0c07a", label: "Classification" },
  DEPARTURE: { light: "#3ba855", dark: "#7ae090", label: "Departure" },
  LEAD: { light: "#222222", dark: "#d4d4d4", label: "Lead" },
  RIP: { light: "#b53b3b", dark: "#e07a7a", label: "RIP" },
  ENGINE_SERVICE: { light: "#7a5ab5", dark: "#b09ae0", label: "Engine Service" },
  CABOOSE: { light: "#b55a8a", dark: "#e09aba", label: "Caboose" },
  RUNAROUND: { light: "#666666", dark: "#aaaaaa", label: "Runaround" },
  SWITCHER_POCKET: { light: "#888888", dark: "#bbbbbb", label: "Switcher Pocket" },
} as const;

export const LOCATION_SIZES: Record<string, number> = {
  YARD: 7,
  PASSENGER_STATION: 7,
  INTERCHANGE: 7,
  JUNCTION: 6,
  STAGING: 6,
  TEAM_TRACK: 5,
  SIDING: 4.5,
} as const;

export function getEdgeColor(trackType: string, isDark: boolean): string {
  switch (trackType) {
    case "mainline":
      return isDark ? "#c8cdd8" : "#3a3f4b";
    case "branch":
      return isDark ? "#94a3b8" : "#64748b";
    case "spur":
      return isDark ? "#78716c" : "#57534e";
    default:
      return isDark ? "#c8cdd8" : "#3a3f4b";
  }
}
