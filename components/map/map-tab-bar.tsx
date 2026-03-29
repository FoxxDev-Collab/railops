"use client";

import { useMapStore, type MapTab } from "./use-map-store";

interface MapTabBarProps {
  locations: { id: string; name: string; locationType: string }[];
  saveStatus: "saved" | "saving" | "unsaved";
}

const TABS: { id: MapTab; label: string }[] = [
  { id: "locations", label: "Locations" },
  { id: "track-layout", label: "Track Layout" },
  { id: "yard-detail", label: "Yard Detail" },
];

export function MapTabBar({ locations, saveStatus }: MapTabBarProps) {
  const activeTab = useMapStore((s) => s.activeTab);
  const setActiveTab = useMapStore((s) => s.setActiveTab);
  const yardDetailLocationId = useMapStore((s) => s.yardDetailLocationId);
  const setYardDetailLocation = useMapStore((s) => s.setYardDetailLocation);

  return (
    <div className="flex items-center border-b border-border bg-card">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-5 py-2 font-mono text-xs transition-colors ${
            activeTab === tab.id
              ? "border-b-2 border-foreground font-bold text-foreground bg-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}

      <div className="flex-1" />

      {activeTab === "yard-detail" && (
        <div className="flex items-center gap-2 px-3">
          <span className="text-muted-foreground font-mono text-[10px] tracking-wider">VIEWING:</span>
          <select
            value={yardDetailLocationId ?? ""}
            onChange={(e) => setYardDetailLocation(e.target.value || null)}
            className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
          >
            <option value="">Select location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="px-3 font-mono text-xs">
        {saveStatus === "saved" && <span className="text-green-600 dark:text-green-400">Saved</span>}
        {saveStatus === "saving" && <span className="text-amber-600 dark:text-amber-400">Saving...</span>}
        {saveStatus === "unsaved" && <span className="text-muted-foreground">Unsaved</span>}
      </div>
    </div>
  );
}
