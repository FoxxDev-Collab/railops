"use client";

import { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getErrorLogs } from "@/app/actions/admin/health";

interface ErrorEntry {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  source: string | null;
  action: string | null;
  userId: string | null;
  metadata: unknown;
  createdAt: Date;
}

interface ErrorBrowserProps {
  initialLogs: ErrorEntry[];
  total: number;
  page: number;
  totalPages: number;
  frequencyData: Array<{ hour: string; error: number; warn: number; fatal: number }>;
}

export function ErrorBrowserClient({
  initialLogs,
  total,
  page: initialPage,
  totalPages: initialTotalPages,
  frequencyData,
}: ErrorBrowserProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(total);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  function fetchLogs(p: number, lvl?: string, src?: string) {
    startTransition(async () => {
      const result = await getErrorLogs({
        page: p,
        level: lvl && lvl !== "all" ? lvl : undefined,
        source: src && src !== "all" ? src : undefined,
      });
      setLogs(result.logs);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
    });
  }

  function handleFilter() {
    fetchLogs(1, level, source);
  }

  return (
    <div className="space-y-6">
      {/* Frequency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Errors per Hour (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(11, 16)}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="error" fill="hsl(var(--destructive))" stackId="a" />
                <Bar dataKey="warn" fill="hsl(var(--primary) / 0.6)" stackId="a" />
                <Bar dataKey="fatal" fill="#991b1b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Level</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="fatal">Fatal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Source</label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="server-action">Server Action</SelectItem>
              <SelectItem value="api-route">API Route</SelectItem>
              <SelectItem value="middleware">Middleware</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-9" onClick={handleFilter} disabled={isPending}>
          Filter
        </Button>
      </div>

      {/* Error list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Errors ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No errors match filters</p>
          ) : (
            <div className="space-y-1">
              {logs.map((error) => (
                <div key={error.id} className="border rounded">
                  <button
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                  >
                    <Badge
                      variant={error.level === "warn" ? "secondary" : "destructive"}
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5"
                    >
                      {error.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{error.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {error.source && <span>{error.source} · </span>}
                        {error.action && <span>{error.action} · </span>}
                        {new Date(error.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {expandedId === error.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expandedId === error.id && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-muted/30">
                      {error.stack && (
                        <pre className="text-xs overflow-x-auto p-2 mt-2 rounded bg-background font-mono">
                          {error.stack}
                        </pre>
                      )}
                      {error.userId && (
                        <p className="text-xs">
                          <span className="text-muted-foreground">User: </span>
                          <a href={`/admin/users/${error.userId}`} className="text-primary hover:underline">
                            {error.userId}
                          </a>
                        </p>
                      )}
                      {error.metadata !== null && error.metadata !== undefined ? (
                        <pre className="text-xs overflow-x-auto p-2 rounded bg-background font-mono">
                          {JSON.stringify(error.metadata, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(page - 1, level, source)}
                  disabled={page <= 1 || isPending}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(page + 1, level, source)}
                  disabled={page >= totalPages || isPending}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
