"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CabooseType, RollingStockStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteCaboose } from "@/app/actions/cabooses";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface Caboose {
  id: string;
  reportingMarks: string;
  number: string;
  cabooseType: CabooseType;
  road: string | null;
  length: number | null;
  status: RollingStockStatus;
}

const cabooseTypeLabels: Record<CabooseType, string> = {
  STANDARD: "Standard",
  EXTENDED_VISION: "Extended Vision",
  BAY_WINDOW: "Bay Window",
  TRANSFER: "Transfer",
  BOBBER: "Bobber",
};

const statusColors: Record<RollingStockStatus, "default" | "destructive" | "secondary" | "outline"> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

function getColumns(layoutId: string): ColumnDef<Caboose, unknown>[] {
  return [
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
      accessorKey: "cabooseType",
      header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
      cell: ({ row }) => cabooseTypeLabels[row.original.cabooseType],
      filterFn: (row, _columnId, filterValue: string) => row.original.cabooseType === filterValue,
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
      accessorKey: "road",
      header: ({ column }) => <SortableHeader column={column}>Road</SortableHeader>,
      cell: ({ row }) => row.original.road ?? <span className="text-muted-foreground">—</span>,
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
            <Link href={`/dashboard/railroad/${layoutId}/cabooses/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={`${row.original.reportingMarks} ${row.original.number}`}
            itemType="caboose"
            onDelete={() => deleteCaboose(row.original.id)}
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
    columnId: "cabooseType",
    label: "Type",
    options: [
      { label: "Standard", value: "STANDARD" },
      { label: "Extended Vision", value: "EXTENDED_VISION" },
      { label: "Bay Window", value: "BAY_WINDOW" },
      { label: "Transfer", value: "TRANSFER" },
      { label: "Bobber", value: "BOBBER" },
    ],
  },
];

interface CabooseTableProps {
  cabooses: Caboose[];
  layoutId: string;
}

export function CabooseTable({ cabooses, layoutId }: CabooseTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={cabooses}
      searchPlaceholder="Search by reporting marks..."
      searchColumnId="reportingMarks"
      filters={filters}
    />
  );
}
