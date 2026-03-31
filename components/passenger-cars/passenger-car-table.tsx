"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { RollingStockStatus, PassengerCarType, ClassOfService } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deletePassengerCar } from "@/app/actions/passenger-cars";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";
import { SilhouetteImage } from "@/components/ui/silhouette-image";

interface PassengerCar {
  id: string;
  reportingMarks: string;
  number: string;
  carName: string | null;
  carType: PassengerCarType;
  seats: number | null;
  berths: number | null;
  classOfService: ClassOfService;
  length: number | null;
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
  status: RollingStockStatus;
}

const statusColors: Record<RollingStockStatus, "default" | "destructive" | "secondary" | "outline"> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

const carTypeLabels: Record<PassengerCarType, string> = {
  COACH: "Coach",
  SLEEPER: "Sleeper",
  DINER: "Diner",
  LOUNGE: "Lounge",
  BAGGAGE: "Baggage",
  RPO: "RPO",
  COMBINE: "Combine",
  OBSERVATION: "Observation",
};

const classOfServiceLabels: Record<ClassOfService, string> = {
  FIRST: "First Class",
  BUSINESS: "Business",
  COACH: "Coach",
};

function getColumns(layoutId: string): ColumnDef<PassengerCar, unknown>[] {
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
      accessorKey: "carName",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => row.original.carName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "carType",
      header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
      cell: ({ row }) => carTypeLabels[row.original.carType],
      filterFn: (row, _columnId, filterValue: string) => row.original.carType === filterValue,
    },
    {
      accessorKey: "classOfService",
      header: ({ column }) => <SortableHeader column={column}>Class</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {classOfServiceLabels[row.original.classOfService]}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.classOfService === filterValue,
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
      accessorKey: "seats",
      header: ({ column }) => <SortableHeader column={column}>Seats</SortableHeader>,
      cell: ({ row }) =>
        row.original.seats ? (
          <span className="tabular-nums">{row.original.seats}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "berths",
      header: ({ column }) => <SortableHeader column={column}>Berths</SortableHeader>,
      cell: ({ row }) =>
        row.original.berths ? (
          <span className="tabular-nums">{row.original.berths}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/dashboard/railroad/${layoutId}/passenger-cars/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={`${row.original.reportingMarks} ${row.original.number}`}
            itemType="passenger car"
            onDelete={() => deletePassengerCar(row.original.id)}
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
    columnId: "carType",
    label: "Type",
    options: [
      { label: "Coach", value: "COACH" },
      { label: "Sleeper", value: "SLEEPER" },
      { label: "Diner", value: "DINER" },
      { label: "Lounge", value: "LOUNGE" },
      { label: "Baggage", value: "BAGGAGE" },
      { label: "RPO", value: "RPO" },
      { label: "Combine", value: "COMBINE" },
      { label: "Observation", value: "OBSERVATION" },
    ],
  },
];

interface PassengerCarTableProps {
  passengerCars: PassengerCar[];
  layoutId: string;
}

export function PassengerCarTable({ passengerCars, layoutId }: PassengerCarTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={passengerCars}
      searchPlaceholder="Search by reporting marks..."
      searchColumnId="reportingMarks"
      filters={filters}
    />
  );
}
