"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollectionViewProps {
  cardView: React.ReactNode;
  tableView: React.ReactNode;
  defaultView?: "cards" | "table";
}

export function CollectionView({
  cardView,
  tableView,
  defaultView = "cards",
}: CollectionViewProps) {
  const [view, setView] = useState<"cards" | "table">(defaultView);

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs gap-1.5 rounded-md transition-all duration-150",
              view === "cards"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs gap-1.5 rounded-md transition-all duration-150",
              view === "table"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setView("table")}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Table</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "cards" ? cardView : tableView}
    </div>
  );
}
