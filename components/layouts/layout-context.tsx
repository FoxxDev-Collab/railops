"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export interface LayoutData {
  id: string;
  name: string;
  scale: string | null;
  description: string | null;
}

interface LayoutContextType {
  selectedLayout: LayoutData | null;
  layouts: LayoutData[];
  setSelectedLayout: (layout: LayoutData | null) => void;
  isLoading: boolean;
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(
  undefined
);

interface LayoutProviderProps {
  children: React.ReactNode;
  initialLayout: LayoutData | null;
  layouts: LayoutData[];
}

export function LayoutProvider({
  children,
  initialLayout,
  layouts,
}: LayoutProviderProps) {
  const [selectedLayout, setSelectedLayoutState] =
    React.useState<LayoutData | null>(initialLayout);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const setSelectedLayout = React.useCallback(
    async (layout: LayoutData | null) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/layouts/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layoutId: layout?.id ?? null }),
        });

        if (response.ok) {
          setSelectedLayoutState(layout);
          router.refresh();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return (
    <LayoutContext.Provider
      value={{ selectedLayout, layouts, setSelectedLayout, isLoading }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = React.useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
