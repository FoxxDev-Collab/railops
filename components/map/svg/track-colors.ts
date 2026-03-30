export const TRACK_TYPE_COLORS = {
  LEAD:              { light: "#3a3f4b", dark: "#c8cdd8", label: "Lead / Main" },
  ARRIVAL:           { light: "#059669", dark: "#34d399", label: "Arrival" },
  CLASSIFICATION:    { light: "#2563eb", dark: "#4a9eff", label: "Classification" },
  DEPARTURE:         { light: "#d97706", dark: "#f59e0b", label: "Departure" },
  ENGINE_SERVICE:    { light: "#7c3aed", dark: "#a78bfa", label: "Engine Service" },
  RIP:               { light: "#dc2626", dark: "#f87171", label: "RIP / Bad Order" },
  CABOOSE:           { light: "#ea580c", dark: "#fb923c", label: "Caboose" },
  RUNAROUND:         { light: "#64748b", dark: "#94a3b8", label: "Runaround" },
  SWITCHER_POCKET:   { light: "#57534e", dark: "#78716c", label: "Switcher Pocket" },
} as const

export type TrackTypeName = keyof typeof TRACK_TYPE_COLORS

export const TURNOUT_COLOR = { light: "#c2410c", dark: "#ff8c42" }
export const BUMPER_COLOR = { light: "#dc2626", dark: "#ef4444" }
export const ENDPOINT_COLOR = { light: "#2563eb", dark: "#4a9eff" }
export const SELECTION_COLOR = { light: "#2563eb", dark: "#4a9eff" }

export function getTrackColor(trackType: string, isDark: boolean): string {
  const entry = TRACK_TYPE_COLORS[trackType as TrackTypeName]
  if (!entry) return isDark ? "#c8cdd8" : "#3a3f4b"
  return isDark ? entry.dark : entry.light
}

export function getTurnoutColor(isDark: boolean): string {
  return isDark ? TURNOUT_COLOR.dark : TURNOUT_COLOR.light
}

export function getBumperColor(isDark: boolean): string {
  return isDark ? BUMPER_COLOR.dark : BUMPER_COLOR.light
}

export function getEndpointColor(isDark: boolean): string {
  return isDark ? ENDPOINT_COLOR.dark : ENDPOINT_COLOR.light
}

export function getSelectionColor(isDark: boolean): string {
  return isDark ? SELECTION_COLOR.dark : SELECTION_COLOR.light
}
