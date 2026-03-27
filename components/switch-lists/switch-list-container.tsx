"use client";

import { useRouter } from "next/navigation";
import { SwitchListView } from "./switch-list-view";
import type { SwitchListEntry } from "@prisma/client";

interface SwitchListContainerProps {
  switchList: {
    id: string;
    generatedAt: Date;
    notes: string | null;
    entries: SwitchListEntry[];
  };
  train: {
    trainNumber: string;
    trainName: string | null;
    origin?: { name: string } | null;
    destination?: { name: string } | null;
  };
  consistId: string;
  layoutId: string;
}

export function SwitchListContainer({
  switchList,
  train,
  consistId,
  layoutId,
}: SwitchListContainerProps) {
  const router = useRouter();

  return (
    <SwitchListView
      switchList={switchList}
      train={train}
      onRegenerate={() => router.refresh()}
      consistId={consistId}
      layoutId={layoutId}
    />
  );
}
