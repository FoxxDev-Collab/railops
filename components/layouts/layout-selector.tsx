"use client";

import { Map, Plus } from "lucide-react";
import Link from "next/link";
import { useLayout, LayoutData } from "./layout-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function LayoutSelector() {
  const { selectedLayout, layouts, setSelectedLayout, isLoading } = useLayout();

  // If there's only one layout, just show a static display
  if (layouts.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <Map className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{layouts[0].name}</span>
        {layouts[0].scale && (
          <span className="text-xs text-muted-foreground">
            ({layouts[0].scale})
          </span>
        )}
      </div>
    );
  }

  // If no layouts exist, show a prompt to create one
  if (layouts.length === 0) {
    return (
      <Link
        href="/dashboard/layouts/new"
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create a layout</span>
      </Link>
    );
  }

  const handleValueChange = (value: string) => {
    const layout = layouts.find((l) => l.id === value);
    if (layout) {
      setSelectedLayout(layout);
    }
  };

  return (
    <Select
      value={selectedLayout?.id ?? ""}
      onValueChange={handleValueChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full border-0 shadow-none focus-visible:ring-0 hover:bg-accent/50">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select a layout">
            {selectedLayout ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{selectedLayout.name}</span>
                {selectedLayout.scale && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedLayout.scale})
                  </span>
                )}
              </span>
            ) : (
              "Select a layout"
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent align="start">
        {layouts.map((layout) => (
          <SelectItem key={layout.id} value={layout.id}>
            <span className="flex items-center gap-2">
              <span>{layout.name}</span>
              {layout.scale && (
                <span className="text-xs text-muted-foreground">
                  ({layout.scale})
                </span>
              )}
            </span>
          </SelectItem>
        ))}
        <SelectSeparator />
        <Link
          href="/dashboard/layouts"
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors"
        >
          Manage layouts
        </Link>
      </SelectContent>
    </Select>
  );
}

export function LayoutSelectorSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
