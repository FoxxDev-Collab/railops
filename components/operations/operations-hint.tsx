"use client";

import { useSyncExternalStore, useCallback } from "react";
import { Info, X } from "lucide-react";
import Link from "next/link";

interface OperationsHintProps {
  pageKey: string;
  title: string;
  children: React.ReactNode;
  guideSection?: string;
  railroadId: string;
}

function useLocalStorageFlag(key: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key]
  );

  const getSnapshot = useCallback(() => localStorage.getItem(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function OperationsHint({
  pageKey,
  title,
  children,
  guideSection,
  railroadId,
}: OperationsHintProps) {
  const storageKey = `hint-dismissed-${pageKey}`;
  const dismissed = useLocalStorageFlag(storageKey);

  function dismiss() {
    localStorage.setItem(storageKey, "true");
    // Dispatch storage event so useSyncExternalStore picks it up
    window.dispatchEvent(
      new StorageEvent("storage", { key: storageKey, newValue: "true" })
    );
  }

  if (dismissed) return null;

  const guideHref = `/dashboard/railroad/${railroadId}/guide${guideSection ?? ""}`;

  return (
    <div className="relative flex items-start gap-3 rounded-lg border-l-4 border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          {title}
        </p>
        <div className="mt-0.5 text-sm text-blue-800/80 dark:text-blue-300/80">
          {children}
        </div>
        <Link
          href={guideHref}
          className="mt-1.5 inline-block text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline-offset-2 hover:underline"
        >
          Learn more in the Operations Guide
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 transition-colors"
        aria-label={`Dismiss ${title} hint`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
