"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowRight } from "lucide-react";
import { WaybillStatus, LoadStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteWaybill } from "@/app/actions/waybills";
import { DataTable, SortableHeader, type FilterDef } from "@/components/shared/data-table";

interface WaybillPanel {
  panelNumber: number;
  loadStatus: LoadStatus;
  commodity: string | null;
  weight: number | null;
  specialInstructions: string | null;
  routeVia: string | null;
  originId: string | null;
  shipperIndustryId: string | null;
  destinationId: string | null;
  consigneeIndustryId: string | null;
  origin?: { id: string; name: string } | null;
  destination?: { id: string; name: string } | null;
  shipperIndustry?: { id: string; name: string } | null;
  consigneeIndustry?: { id: string; name: string } | null;
}

interface Waybill {
  id: string;
  status: WaybillStatus;
  isReturnable: boolean;
  notes: string | null;
  currentPanel: number;
  panels: WaybillPanel[];
  carCard: {
    freightCarId: string;
    freightCar: {
      id: string;
      reportingMarks: string;
      number: string;
    };
  } | null;
}

const statusVariant: Record<WaybillStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  IN_TRANSIT: "default",
  DELIVERED: "outline",
  RETURNED_EMPTY: "secondary",
};

const statusLabel: Record<WaybillStatus, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  RETURNED_EMPTY: "Returned Empty",
};

function getActivePanel(waybill: Waybill) {
  return waybill.panels.find((p) => p.panelNumber === waybill.currentPanel) ?? waybill.panels[0];
}

function getColumns(layoutId: string): ColumnDef<Waybill, unknown>[] {
  return [
    {
      id: "car",
      header: ({ column }) => <SortableHeader column={column}>Car</SortableHeader>,
      accessorFn: (row) => {
        const car = row.carCard?.freightCar;
        return car ? `${car.reportingMarks} ${car.number}` : "Unassigned";
      },
      cell: ({ row }) => {
        const car = row.original.carCard?.freightCar;
        return car ? (
          <span className="font-mono tracking-wide font-medium">{car.reportingMarks} {car.number}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]} className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {statusLabel[row.original.status]}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue: string) => row.original.status === filterValue,
    },
    {
      id: "panel",
      header: "Panel",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.currentPanel} of {row.original.panels.length}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "loadStatus",
      header: ({ column }) => <SortableHeader column={column}>Load</SortableHeader>,
      accessorFn: (row) => getActivePanel(row)?.loadStatus ?? "",
      cell: ({ row }) => {
        const panel = getActivePanel(row.original);
        if (!panel) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant={panel.loadStatus === "LOADED" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 font-normal">
            {panel.loadStatus === "LOADED" ? "Loaded" : "Empty"}
          </Badge>
        );
      },
    },
    {
      id: "commodity",
      header: ({ column }) => <SortableHeader column={column}>Commodity</SortableHeader>,
      accessorFn: (row) => getActivePanel(row)?.commodity ?? "",
      cell: ({ row }) => {
        const panel = getActivePanel(row.original);
        return panel?.commodity ? (
          <span className="font-medium">{panel.commodity}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => {
        const panel = getActivePanel(row.original);
        if (!panel?.origin && !panel?.destination) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="truncate max-w-[80px]">{panel?.origin?.name ?? "—"}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="truncate max-w-[80px]">{panel?.destination?.name ?? "—"}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "industries",
      header: "Shipper / Consignee",
      cell: ({ row }) => {
        const panel = getActivePanel(row.original);
        if (!panel?.shipperIndustry && !panel?.consigneeIndustry) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {panel?.shipperIndustry && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-normal">
                From: {panel.shipperIndustry.name}
              </Badge>
            )}
            {panel?.consigneeIndustry && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-normal">
                To: {panel.consigneeIndustry.name}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "isReturnable",
      header: "Ret.",
      cell: ({ row }) =>
        row.original.isReturnable ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">Yes</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">No</span>
        ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const car = row.original.carCard?.freightCar;
        const carLabel = car ? `${car.reportingMarks} ${car.number}` : "waybill";
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
              <Link href={`/dashboard/railroad/${layoutId}/waybills/${row.original.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
            <DeleteButton
              itemName={`waybill for ${carLabel}`}
              itemType="waybill"
              onDelete={() => deleteWaybill(row.original.id, layoutId)}
            />
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}

const filters: FilterDef[] = [
  {
    columnId: "status",
    label: "Status",
    options: [
      { label: "Pending", value: "PENDING" },
      { label: "In Transit", value: "IN_TRANSIT" },
      { label: "Delivered", value: "DELIVERED" },
      { label: "Returned Empty", value: "RETURNED_EMPTY" },
    ],
  },
];

interface WaybillTableProps {
  waybills: Waybill[];
  layoutId: string;
}

export function WaybillTable({ waybills, layoutId }: WaybillTableProps) {
  const columns = getColumns(layoutId);
  return (
    <DataTable
      columns={columns}
      data={waybills}
      searchPlaceholder="Search by car..."
      searchColumnId="car"
      filters={filters}
    />
  );
}
