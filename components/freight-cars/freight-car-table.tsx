"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { RollingStockStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteFreightCar } from "@/app/actions/freight-cars";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";
import { SilhouetteImage } from "@/components/ui/silhouette-image";

interface FreightCar {
  id: string;
  reportingMarks: string;
  number: string;
  carType: string;
  aarTypeCode: string | null;
  subtype: string | null;
  length: number | null;
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
  capacity: number | null;
  homeRoad: string | null;
  status: RollingStockStatus;
  commodities: string[];
  currentLocationId: string | null;
}

const statusColors: Record<RollingStockStatus, "default" | "destructive" | "secondary" | "outline"> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

function getColumns(layoutId: string): ColumnDef<FreightCar, unknown>[] {
  return [
    {
      id: "silhouette",
      header: "",
      cell: ({ row }) =>
        row.original.silhouette ? (
          <SilhouetteImage
            filePath={row.original.silhouette.filePath}
            alt={row.original.silhouette.name}
            className="h-6 w-16"
          />
        ) : null,
      enableSorting: false,
    },
    {
      accessorKey: "reportingMarks",
      header: ({ column }) => <SortableHeader column={column}>Marks</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono tracking-wide font-medium">
          {row.original.reportingMarks} {row.original.number}
        </span>
      ),
      filterFn: (row, _columnId, filterValue: string) => {
        const combined = `${row.original.reportingMarks} ${row.original.number}`.toLowerCase();
        return combined.includes(filterValue.toLowerCase());
      },
    },
    {
      accessorKey: "carType",
      header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <span>{row.original.carType}</span>
          {row.original.subtype && (
            <span className="text-muted-foreground ml-1">— {row.original.subtype}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "aarTypeCode",
      header: ({ column }) => <SortableHeader column={column}>AAR</SortableHeader>,
      cell: ({ row }) =>
        row.original.aarTypeCode ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono tracking-wider">
            {row.original.aarTypeCode}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
      accessorKey: "homeRoad",
      header: ({ column }) => <SortableHeader column={column}>Home Road</SortableHeader>,
      cell: ({ row }) => row.original.homeRoad ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "capacity",
      header: ({ column }) => <SortableHeader column={column}>Capacity</SortableHeader>,
      cell: ({ row }) =>
        row.original.capacity ? `${row.original.capacity}T` : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "commodities",
      header: "Commodities",
      cell: ({ row }) =>
        row.original.commodities.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {row.original.commodities.map((c) => (
              <Badge key={c} variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-normal">
                {c}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/dashboard/railroad/${layoutId}/rolling-stock/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={`${row.original.reportingMarks} ${row.original.number}`}
            itemType="freight car"
            onDelete={() => deleteFreightCar(row.original.id)}
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
];

interface FreightCarTableProps {
  freightCars: FreightCar[];
  layoutId: string;
}

export function FreightCarTable({ freightCars, layoutId }: FreightCarTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={freightCars}
      searchPlaceholder="Search by reporting marks..."
      searchColumnId="reportingMarks"
      filters={filters}
    />
  );
}
