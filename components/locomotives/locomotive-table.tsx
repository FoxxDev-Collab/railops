"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Cpu, Volume2 } from "lucide-react";
import { LocomotiveType, LocomotiveService, RollingStockStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteLocomotive } from "@/app/actions/locomotives";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface Locomotive {
  id: string;
  road: string;
  number: string;
  model: string;
  locomotiveType: LocomotiveType;
  serviceType: LocomotiveService;
  horsepower: number | null;
  status: RollingStockStatus;
  dccAddress: number | null;
  decoderManufacturer: string | null;
  decoderModel: string | null;
  hasSound: boolean;
  length: number | null;
  fuelType: string | null;
  canPull: number | null;
  currentLocationId: string | null;
}

const typeLabels: Record<LocomotiveType, string> = {
  STEAM: "Steam",
  DIESEL_ROAD: "Diesel Road",
  DIESEL_SWITCHER: "Switcher",
  DIESEL_CAB: "Cab Unit",
  ELECTRIC: "Electric",
};

const statusColors: Record<RollingStockStatus, "default" | "destructive" | "secondary" | "outline"> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

function getColumns(layoutId: string): ColumnDef<Locomotive, unknown>[] {
  return [
    {
      accessorKey: "road",
      header: ({ column }) => <SortableHeader column={column}>Road / Number</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono tracking-wide font-medium">
          {row.original.road} #{row.original.number}
        </span>
      ),
      filterFn: (row, _columnId, filterValue: string) => {
        const combined = `${row.original.road} ${row.original.number}`.toLowerCase();
        return combined.includes(filterValue.toLowerCase());
      },
    },
    {
      accessorKey: "model",
      header: ({ column }) => <SortableHeader column={column}>Model</SortableHeader>,
    },
    {
      accessorKey: "locomotiveType",
      header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {typeLabels[row.original.locomotiveType]}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.locomotiveType === filterValue,
    },
    {
      accessorKey: "serviceType",
      header: ({ column }) => <SortableHeader column={column}>Service</SortableHeader>,
      cell: ({ row }) => row.original.serviceType.replace(/_/g, " "),
      filterFn: (row, _columnId, filterValue: string) => row.original.serviceType === filterValue,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant={statusColors[row.original.status]} className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.status === filterValue,
    },
    {
      accessorKey: "horsepower",
      header: ({ column }) => <SortableHeader column={column}>HP</SortableHeader>,
      cell: ({ row }) =>
        row.original.horsepower ? (
          <span className="tabular-nums">{row.original.horsepower.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "dccAddress",
      header: ({ column }) => <SortableHeader column={column}>DCC</SortableHeader>,
      cell: ({ row }) => {
        const loco = row.original;
        if (!loco.dccAddress && !loco.hasSound) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2 text-xs">
            {loco.dccAddress && (
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{loco.dccAddress}</span>
              </span>
            )}
            {loco.hasSound && <Volume2 className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      },
    },
    {
      accessorKey: "length",
      header: ({ column }) => <SortableHeader column={column}>Length</SortableHeader>,
      cell: ({ row }) =>
        row.original.length ? `${row.original.length}ft` : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/dashboard/railroad/${layoutId}/locomotives/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={`${row.original.road} #${row.original.number}`}
            itemType="locomotive"
            onDelete={() => deleteLocomotive(row.original.id)}
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
      { label: "Serviceable", value: "SERVICEABLE" },
      { label: "Bad Order", value: "BAD_ORDER" },
      { label: "Stored", value: "STORED" },
      { label: "Retired", value: "RETIRED" },
    ],
  },
  {
    columnId: "locomotiveType",
    label: "Type",
    options: [
      { label: "Steam", value: "STEAM" },
      { label: "Diesel Road", value: "DIESEL_ROAD" },
      { label: "Switcher", value: "DIESEL_SWITCHER" },
      { label: "Cab Unit", value: "DIESEL_CAB" },
      { label: "Electric", value: "ELECTRIC" },
    ],
  },
];

interface LocomotiveTableProps {
  locomotives: Locomotive[];
  layoutId: string;
}

export function LocomotiveTable({ locomotives, layoutId }: LocomotiveTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={locomotives}
      searchPlaceholder="Search by road or number..."
      searchColumnId="road"
      filters={filters}
    />
  );
}
