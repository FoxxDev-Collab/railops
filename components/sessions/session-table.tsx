"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Play, CheckCircle, XCircle } from "lucide-react";
import { SessionStatus } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteSession, updateSessionStatus } from "@/app/actions/sessions";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface SessionTrain {
  train: { id: string; trainNumber: string; trainName: string | null };
}

interface OperatingSession {
  id: string;
  name: string;
  date: Date;
  notes: string | null;
  status: SessionStatus;
  sessionTrains: SessionTrain[];
}

const statusConfig: Record<
  SessionStatus,
  { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
> = {
  PLANNED: { variant: "secondary", label: "Planned" },
  IN_PROGRESS: { variant: "default", label: "In Progress" },
  COMPLETED: { variant: "outline", label: "Completed" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
};

function StatusActions({ session, layoutId }: { session: OperatingSession; layoutId: string }) {
  const [isLoading, setIsLoading] = useState<SessionStatus | null>(null);
  const router = useRouter();

  async function handleStatus(status: SessionStatus) {
    setIsLoading(status);
    const result = await updateSessionStatus(session.id, layoutId, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(status === "IN_PROGRESS" ? "Session started" : status === "COMPLETED" ? "Session completed" : "Session cancelled");
      router.refresh();
    }
    setIsLoading(null);
  }

  if (session.status === "PLANNED") {
    return (
      <Button size="sm" variant="default" className="h-6 px-2 text-[10px] gap-1" onClick={() => handleStatus("IN_PROGRESS")} disabled={!!isLoading}>
        <Play className="h-3 w-3" /> Start
      </Button>
    );
  }
  if (session.status === "IN_PROGRESS") {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-6 px-2 text-[10px] gap-1" onClick={() => handleStatus("COMPLETED")} disabled={!!isLoading}>
          <CheckCircle className="h-3 w-3" /> Complete
        </Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 text-destructive" onClick={() => handleStatus("CANCELLED")} disabled={!!isLoading}>
          <XCircle className="h-3 w-3" /> Cancel
        </Button>
      </div>
    );
  }
  return null;
}

function getColumns(layoutId: string): ColumnDef<OperatingSession, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
      sortingFn: (a, b) => new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => {
        const config = statusConfig[row.original.status];
        return (
          <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-4 font-normal gap-1.5">
            {row.original.status === "IN_PROGRESS" && (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
            )}
            {config.label}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue: string) => row.original.status === filterValue,
    },
    {
      id: "trains",
      header: ({ column }) => <SortableHeader column={column}>Trains</SortableHeader>,
      accessorFn: (row) => row.sessionTrains.length,
      cell: ({ row }) => {
        const trains = row.original.sessionTrains;
        if (trains.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {trains.map(({ train }) => (
              <Badge key={train.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono tracking-wider">
                {train.trainNumber}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "statusActions",
      header: "",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusActions session={row.original} layoutId={layoutId} />
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/dashboard/railroad/${layoutId}/sessions/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={row.original.name}
            itemType="operating session"
            onDelete={() => deleteSession(row.original.id, layoutId)}
          />
        </div>
      ),
      enableSorting: false,
    },
  ];
}

const filters: FilterDef[] = [
  {
    columnId: "status",
    label: "Status",
    options: [
      { label: "Planned", value: "PLANNED" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "Completed", value: "COMPLETED" },
      { label: "Cancelled", value: "CANCELLED" },
    ],
  },
];

interface SessionTableProps {
  sessions: OperatingSession[];
  layoutId: string;
}

export function SessionTable({ sessions, layoutId }: SessionTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={sessions}
      searchPlaceholder="Search sessions..."
      searchColumnId="name"
      filters={filters}
    />
  );
}
