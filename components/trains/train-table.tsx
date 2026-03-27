"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowRight } from "lucide-react";
import { TrainClass, TrainServiceType } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteTrain } from "@/app/actions/trains";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface Location {
  id: string;
  name: string;
  code: string;
}

interface Train {
  id: string;
  trainNumber: string;
  trainName: string | null;
  trainClass: TrainClass;
  serviceType: TrainServiceType;
  departureTime: string | null;
  symbol: string | null;
  description: string | null;
  originId: string | null;
  origin: Location | null;
  destinationId: string | null;
  destination: Location | null;
  isActive: boolean;
}

const classLabels: Record<TrainClass, string> = {
  MANIFEST: "Manifest",
  UNIT: "Unit",
  INTERMODAL: "Intermodal",
  LOCAL: "Local",
  PASSENGER: "Passenger",
  WORK: "Work",
  LIGHT_ENGINE: "Light Engine",
};

function getColumns(layoutId: string): ColumnDef<Train, unknown>[] {
  return [
    {
      accessorKey: "trainNumber",
      header: ({ column }) => <SortableHeader column={column}>Number</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono tracking-wide font-medium">
          {row.original.trainNumber}
        </span>
      ),
    },
    {
      accessorKey: "trainName",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => row.original.trainName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "symbol",
      header: ({ column }) => <SortableHeader column={column}>Symbol</SortableHeader>,
      cell: ({ row }) =>
        row.original.symbol ? (
          <span className="font-mono tracking-widest text-xs text-muted-foreground">{row.original.symbol}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "trainClass",
      header: ({ column }) => <SortableHeader column={column}>Class</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {classLabels[row.original.trainClass]}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.trainClass === filterValue,
    },
    {
      accessorKey: "serviceType",
      header: ({ column }) => <SortableHeader column={column}>Service</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {row.original.serviceType}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.serviceType === filterValue,
    },
    {
      accessorKey: "departureTime",
      header: ({ column }) => <SortableHeader column={column}>Departure</SortableHeader>,
      cell: ({ row }) =>
        row.original.departureTime ? (
          <span className="font-mono text-xs">{row.original.departureTime}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => {
        const train = row.original;
        if (!train.origin && !train.destination) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-mono text-muted-foreground">{train.origin?.code ?? "—"}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="font-mono text-muted-foreground">{train.destination?.code ?? "—"}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => <SortableHeader column={column}>Active</SortableHeader>,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 font-normal">Active</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">Inactive</Badge>
        ),
      filterFn: (row, _columnId, filterValue: string) =>
        filterValue === "true" ? row.original.isActive : !row.original.isActive,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/dashboard/railroad/${layoutId}/trains/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={`Train ${row.original.trainNumber}`}
            itemType="train"
            onDelete={() => deleteTrain(row.original.id)}
          />
        </div>
      ),
      enableSorting: false,
    },
  ];
}

const filters: FilterDef[] = [
  {
    columnId: "trainClass",
    label: "Class",
    options: [
      { label: "Manifest", value: "MANIFEST" },
      { label: "Unit", value: "UNIT" },
      { label: "Intermodal", value: "INTERMODAL" },
      { label: "Local", value: "LOCAL" },
      { label: "Passenger", value: "PASSENGER" },
      { label: "Work", value: "WORK" },
      { label: "Light Engine", value: "LIGHT_ENGINE" },
    ],
  },
  {
    columnId: "isActive",
    label: "Status",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

interface TrainTableProps {
  trains: Train[];
  layoutId: string;
}

export function TrainTable({ trains, layoutId }: TrainTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={trains}
      searchPlaceholder="Search trains..."
      searchColumnId="trainNumber"
      filters={filters}
    />
  );
}
