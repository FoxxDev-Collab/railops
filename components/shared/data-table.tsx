"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Filter definition ──────────────────────────────────────────────────────

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  columnId: string;
  label: string;
  options: FilterOption[];
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumnId?: string;
  filters?: FilterDef[];
  onRowClick?: (row: TData) => void;
}

// ─── Sortable header helper ──────────────────────────────────────────────────

export function SortableHeader({
  column,
  children,
}: {
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
      )}
    </Button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchColumnId,
  filters = [],
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchColumnId ? undefined : globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: searchColumnId ? undefined : setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Track active filter pills
  const activeFilters = columnFilters.filter((f) =>
    filters.some((fd) => fd.columnId === f.id)
  );

  return (
    <div className="space-y-3">
      {/* Toolbar: Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={
              searchColumnId
                ? (table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""
                : globalFilter
            }
            onChange={(e) => {
              if (searchColumnId) {
                table.getColumn(searchColumnId)?.setFilterValue(e.target.value);
              } else {
                setGlobalFilter(e.target.value);
              }
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Filter buttons */}
        {filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => {
              const currentValue = table
                .getColumn(filter.columnId)
                ?.getFilterValue() as string | undefined;
              return (
                <FilterDropdown
                  key={filter.columnId}
                  filter={filter}
                  currentValue={currentValue}
                  onChange={(value) => {
                    table.getColumn(filter.columnId)?.setFilterValue(value || undefined);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {activeFilters.map((f) => {
            const filterDef = filters.find((fd) => fd.columnId === f.id);
            const option = filterDef?.options.find((o) => o.value === f.value);
            return (
              <Badge
                key={f.id}
                variant="secondary"
                className="text-xs px-2 py-0.5 h-6 gap-1 font-normal cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => {
                  table.getColumn(f.id)?.setFilterValue(undefined);
                }}
              >
                {filterDef?.label}: {option?.label ?? String(f.value)}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => setColumnFilters([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Row count */}
      <div className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} of {data.length} row
        {data.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ─── Filter dropdown ─────────────────────────────────────────────────────────

function FilterDropdown({
  filter,
  currentValue,
  onChange,
}: {
  filter: FilterDef;
  currentValue: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant={currentValue ? "secondary" : "outline"}
        size="sm"
        className="h-8 text-xs gap-1.5 font-normal"
        onClick={() => setOpen(!open)}
      >
        {filter.label}
        {currentValue && (
          <span className="ml-0.5 rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
            {filter.options.find((o) => o.value === currentValue)?.label ?? currentValue}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
            <button
              className={cn(
                "w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                !currentValue && "bg-accent font-medium"
              )}
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              All
            </button>
            {filter.options.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                  currentValue === option.value && "bg-accent font-medium"
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
