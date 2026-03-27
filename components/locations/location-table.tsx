"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Factory } from "lucide-react";
import { LocationType } from "@prisma/client";
import Link from "next/link";
import { DeleteLocationButton } from "./delete-location-button";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface Industry {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  spotCount: number | null;
  trackLength: number | null;
  description: string | null;
  commoditiesIn: string[];
  commoditiesOut: string[];
}

interface Location {
  id: string;
  name: string;
  code: string;
  locationType: LocationType;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  sortOrder: number;
  industries: Industry[];
}

const typeLabels: Record<LocationType, string> = {
  PASSENGER_STATION: "Station",
  YARD: "Yard",
  INTERCHANGE: "Interchange",
  JUNCTION: "Junction",
  STAGING: "Staging",
  TEAM_TRACK: "Team Track",
  SIDING: "Siding",
};

function getColumns(layoutId: string): ColumnDef<Location, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono tracking-widest text-xs text-muted-foreground">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "locationType",
      header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {typeLabels[row.original.locationType]}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.locationType === filterValue,
    },
    {
      id: "industries",
      header: ({ column }) => <SortableHeader column={column}>Industries</SortableHeader>,
      accessorFn: (row) => row.industries.length,
      cell: ({ row }) => {
        const industries = row.original.industries;
        if (industries.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[250px]">
            {industries.slice(0, 3).map((ind) => (
              <Link
                key={ind.id}
                href={`/dashboard/railroad/${layoutId}/locations/${row.original.id}/industries/${ind.id}/edit`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Factory className="h-3 w-3" />
                {ind.name}
              </Link>
            ))}
            {industries.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{industries.length - 3} more</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "population",
      header: ({ column }) => <SortableHeader column={column}>Pop.</SortableHeader>,
      cell: ({ row }) =>
        row.original.population ? (
          <span className="tabular-nums">{row.original.population.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) =>
        row.original.description ? (
          <span className="text-muted-foreground line-clamp-1 max-w-[200px]">
            {row.original.description}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/dashboard/railroad/${layoutId}/locations/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteLocationButton locationId={row.original.id} locationName={row.original.name} />
        </div>
      ),
      enableSorting: false,
    },
  ];
}

const filters: FilterDef[] = [
  {
    columnId: "locationType",
    label: "Type",
    options: [
      { label: "Station", value: "PASSENGER_STATION" },
      { label: "Yard", value: "YARD" },
      { label: "Interchange", value: "INTERCHANGE" },
      { label: "Junction", value: "JUNCTION" },
      { label: "Staging", value: "STAGING" },
      { label: "Team Track", value: "TEAM_TRACK" },
      { label: "Siding", value: "SIDING" },
    ],
  },
];

interface LocationTableProps {
  locations: Location[];
  layoutId: string;
}

export function LocationTable({ locations, layoutId }: LocationTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={locations}
      searchPlaceholder="Search locations..."
      searchColumnId="name"
      filters={filters}
    />
  );
}
