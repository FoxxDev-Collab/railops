"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCohortRetention } from "@/app/actions/admin/analytics";

interface CohortGridProps {
  initialData: Awaited<ReturnType<typeof getCohortRetention>>;
}

function getRetentionColor(pct: number): string {
  if (pct >= 80) return "bg-green-600 text-white";
  if (pct >= 60) return "bg-green-500 text-white";
  if (pct >= 40) return "bg-yellow-500 text-white";
  if (pct >= 20) return "bg-orange-500 text-white";
  if (pct > 0) return "bg-red-500 text-white";
  return "bg-muted text-muted-foreground";
}

export function CohortGrid({ initialData }: CohortGridProps) {
  const [data, setData] = useState(initialData);
  const [months, setMonths] = useState(6);
  const [isPending, startTransition] = useTransition();

  function handleChange(m: number) {
    setMonths(m);
    startTransition(async () => {
      const result = await getCohortRetention(m);
      setData(result);
    });
  }

  const maxRetentionLength = Math.max(...data.map((c) => c.retention.length), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Retention by Cohort</CardTitle>
        <div className="flex gap-1">
          {[6, 12].map((m) => (
            <Button
              key={m}
              variant={months === m ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => handleChange(m)}
              disabled={isPending}
            >
              {m}mo
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">Cohort</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Users</th>
                {Array.from({ length: maxRetentionLength }, (_, i) => (
                  <th key={i} className="text-center p-2 font-medium text-muted-foreground">
                    M{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort) => (
                <tr key={cohort.cohort}>
                  <td className="p-2 font-medium">{cohort.cohort}</td>
                  <td className="p-2 text-center tabular-nums">{cohort.size}</td>
                  {cohort.retention.map((pct, i) => (
                    <td key={i} className="p-1 text-center">
                      <div
                        className={`rounded px-2 py-1 tabular-nums text-[11px] font-medium ${getRetentionColor(pct)}`}
                      >
                        {pct}%
                      </div>
                    </td>
                  ))}
                  {/* Fill remaining cells */}
                  {Array.from(
                    { length: maxRetentionLength - cohort.retention.length },
                    (_, i) => (
                      <td key={`empty-${i}`} className="p-1" />
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
