"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { SilhouetteCategory } from "@prisma/client";

import { cn } from "@/lib/utils";
import { getSilhouettes } from "@/app/actions/silhouettes";
import { SilhouetteImage } from "@/components/ui/silhouette-image";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Silhouette = {
  id: string;
  name: string;
  slug: string;
  category: SilhouetteCategory;
  filePath: string;
  darkPath: string;
};

interface SilhouettePickerProps {
  value?: string | null;
  onChange: (id: string | null) => void;
}

const CATEGORY_LABELS: Record<SilhouetteCategory, string> = {
  DIESEL_GP: "GP",
  DIESEL_SD: "SD",
  DIESEL_ERA: "Era",
  STEAM: "Steam",
  FREIGHT_CAR: "Freight",
  PASSENGER_CAR: "Passenger",
  CABOOSE: "Caboose",
  MOW: "MOW",
};

export function SilhouettePicker({ value, onChange }: SilhouettePickerProps) {
  const [silhouettes, setSilhouettes] = useState<Silhouette[]>([]);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<SilhouetteCategory | null>(null);
  useEffect(() => {
    startTransition(async () => {
      const data = await getSilhouettes();
      setSilhouettes(data);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = silhouettes;
    if (activeCategory) {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    return result;
  }, [silhouettes, activeCategory, search]);

  const selected = useMemo(
    () => (value ? silhouettes.find((s) => s.id === value) ?? null : null),
    [value, silhouettes]
  );

  const categories = useMemo(() => {
    const cats = new Set(silhouettes.map((s) => s.category));
    return Object.values(SilhouetteCategory).filter((c) => cats.has(c));
  }, [silhouettes]);

  function handleSelect(id: string) {
    onChange(value === id ? null : id);
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search silhouettes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant={activeCategory === null ? "default" : "outline"}
          className="cursor-pointer text-[10px] px-1.5 py-0"
          onClick={() => setActiveCategory(null)}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            className="cursor-pointer text-[10px] px-1.5 py-0"
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {CATEGORY_LABELS[cat]}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2">
        {isPending ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            No silhouettes found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-md border p-1.5 transition-colors hover:bg-accent",
                  value === s.id
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-transparent"
                )}
              >
                <SilhouetteImage
                  filePath={s.filePath}
                  alt={s.name}
                  className="h-8 w-full"
                />
                <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground group-hover:text-foreground">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected preview */}
      {selected && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2">
          <SilhouetteImage
            filePath={selected.filePath}
            alt={selected.name}
            className="h-10 w-24 shrink-0"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {selected.name}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
