"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  CreditCard,
  Shield,
  UserCheck,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  adminId: string;
  adminEmail: string;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

interface AuditLogTableProps {
  logs: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  actionTypes: string[];
  onPageChange: (page: number) => void;
  onFilterChange: (filters: { action?: string }) => void;
}

const actionIcons: Record<string, React.ElementType> = {
  user: User,
  settings: Settings,
  billing: CreditCard,
  impersonate: Shield,
  auth: UserCheck,
};

const actionColors: Record<string, string> = {
  "user.delete": "destructive",
  "user.create": "default",
  "user.role.toggle": "secondary",
  "user.plan.change": "secondary",
  "settings.update": "outline",
  "settings.maintenance": "destructive",
  "impersonate.start": "destructive",
  "impersonate.stop": "secondary",
};

function getActionIcon(action: string) {
  const prefix = action.split(".")[0];
  return actionIcons[prefix] ?? Settings;
}

function formatAction(action: string): string {
  return action
    .split(".")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" → ");
}

function formatMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return "";
  return entries
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(", ");
}

export function AuditLogTable({
  logs,
  total,
  page,
  totalPages,
  actionTypes,
  onPageChange,
  onFilterChange,
}: AuditLogTableProps) {
  const [selectedAction, setSelectedAction] = useState<string>("");

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              onFilterChange({ action: e.target.value || undefined });
            }}
          >
            <option value="">All Actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-muted-foreground">{total} entries</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 text-xs">Time</TableHead>
              <TableHead className="h-10 text-xs">Action</TableHead>
              <TableHead className="h-10 text-xs">Admin</TableHead>
              <TableHead className="h-10 text-xs">Target</TableHead>
              <TableHead className="h-10 text-xs">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => {
                const Icon = getActionIcon(log.action);
                const colorVariant =
                  (actionColors[log.action] as "default" | "destructive" | "secondary" | "outline") ?? "secondary";
                return (
                  <TableRow key={log.id}>
                    <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Badge variant={colorVariant} className="text-[10px] px-1.5 py-0 h-4 font-normal">
                          {formatAction(log.action)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm">
                      {log.adminEmail}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {log.entityType ? (
                        <span>
                          {log.entityType}
                          {log.entityId && (
                            <span className="font-mono ml-1 text-[10px]">
                              {log.entityId.slice(0, 8)}...
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">
                      {formatMetadata(log.metadata)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No audit entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
