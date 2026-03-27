"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { MOWEquipmentType, RollingStockStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteMOWEquipment } from "@/app/actions/mow-equipment";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface MOWEquipment {
  id: string;
  reportingMarks: string;
  number: string;
  equipmentType: MOWEquipmentType;
  description: string | null;
  length: number | null;
  status: RollingStockStatus;
}

const equipmentTypeLabels: Record<MOWEquipmentType, string> = {
  BALLAST_CAR: "Ballast Car",
  CRANE: "Crane",
  TOOL_CAR: "Tool Car",
  TAMPER: "Tamper",
  SPREADER: "Spreader",
  FLAT_WITH_RAILS: "Flat with Rails",
  WEED_SPRAYER: "Weed Sprayer",
  SCALE_TEST: "Scale Test",
  OTHER: "Other",
};

const statusColors: Record<RollingStockStatus, "default" | "destructive" | "secondary" | "outline"> = {
  SERVICEABLE: "default",
  BAD_ORDER: "destructive",
  STORED: "secondary",
  RETIRED: "outline",
};

function getColumns(layoutId: string): ColumnDef<MOWEquipment, unknown>[] {
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
      accessorKey: "equipmentType",
      header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
      cell: ({ row }) => equipmentTypeLabels[row.original.equipmentType],
      filterFn: (row, _columnId, filterValue: string) => row.original.equipmentType === filterValue,
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
      accessorKey: "length",
      header: ({ column }) => <SortableHeader column={column}>Length</SortableHeader>,
      cell: ({ row }) =>
        row.original.length ? `${row.original.length}ft` : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) =>
        row.original.description ? (
          <span className="text-muted-foreground line-clamp-1 max-w-[250px]">{row.original.description}</span>
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
            <Link href={`/dashboard/railroad/${layoutId}/mow-equipment/${row.original.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteButton
            itemName={`${row.original.reportingMarks} ${row.original.number}`}
            itemType="MOW equipment"
            onDelete={() => deleteMOWEquipment(row.original.id)}
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
    columnId: "equipmentType",
    label: "Type",
    options: [
      { label: "Ballast Car", value: "BALLAST_CAR" },
      { label: "Crane", value: "CRANE" },
      { label: "Tool Car", value: "TOOL_CAR" },
      { label: "Tamper", value: "TAMPER" },
      { label: "Spreader", value: "SPREADER" },
      { label: "Flat with Rails", value: "FLAT_WITH_RAILS" },
      { label: "Weed Sprayer", value: "WEED_SPRAYER" },
      { label: "Scale Test", value: "SCALE_TEST" },
      { label: "Other", value: "OTHER" },
    ],
  },
];

interface MOWEquipmentTableProps {
  mowEquipment: MOWEquipment[];
  layoutId: string;
}

export function MOWEquipmentTable({ mowEquipment, layoutId }: MOWEquipmentTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={mowEquipment}
      searchPlaceholder="Search by reporting marks..."
      searchColumnId="reportingMarks"
      filters={filters}
    />
  );
}
