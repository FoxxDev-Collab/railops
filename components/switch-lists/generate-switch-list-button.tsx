"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateSwitchList } from "@/app/actions/switch-lists";
import { ListOrdered } from "lucide-react";

interface GenerateSwitchListButtonProps {
  consistId: string;
  layoutId: string;
}

export function GenerateSwitchListButton({
  consistId,
  layoutId,
}: GenerateSwitchListButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateSwitchList(consistId, layoutId);
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleGenerate} disabled={isPending}>
        <ListOrdered className="h-4 w-4 mr-2" />
        {isPending ? "Generating…" : "Generate Switch List"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
