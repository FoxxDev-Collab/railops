"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserActivityFeed } from "@/app/actions/admin/users";

interface TabActivityProps {
  userId: string;
  initialData: Awaited<ReturnType<typeof getUserActivityFeed>>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TabActivity({ userId, initialData }: TabActivityProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function loadPage(page: number) {
    startTransition(async () => {
      const result = await getUserActivityFeed(userId, { page });
      setData(result);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {data.activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
        ) : (
          <div className="space-y-2">
            {data.activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">{a.action}</Badge>
                  {a.metadata && (
                    <span className="text-xs text-muted-foreground">
                      {JSON.stringify(a.metadata)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadPage(data.page - 1)} disabled={data.page <= 1 || isPending}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => loadPage(data.page + 1)} disabled={data.page >= data.totalPages || isPending}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
