"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Search,
  Plus,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  X,
  MapPin,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type PropertyStats = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  monthlyRevenue: number;
  collectedThisMonth: number;
  arrears: number;
};

type Property = {
  _id: string;
  propertyName: string;
  location: {
    city: string;
    county: string;
    country: string;
    physicalAddress: string;
    coordinates?: { lat: number; lng: number };
  };
  unitTypes: { _id: string; name: string; count: number; rentAmount: number }[];
  createdAt: string;
  stats: PropertyStats;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function configuredUnits(p: Property) {
  return p.unitTypes.reduce((sum, u) => sum + u.count, 0);
}

function locationString(p: Property) {
  return [p.location.city, p.location.county].filter(Boolean).join(", ");
}

function fmtKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3 ml-1 inline-block" />;
  if (sorted === "desc") return <ArrowDown className="size-3 ml-1 inline-block" />;
  return <ArrowUpDown className="size-3 ml-1 inline-block opacity-40" />;
}

// ─── Collection rate cell ─────────────────────────────────────────────────────

function CollectionRateCell({ stats }: { stats: PropertyStats }) {
  const { monthlyRevenue, collectedThisMonth } = stats;

  if (monthlyRevenue === 0) {
    return <span className="text-xs text-muted-foreground">No active leases</span>;
  }

  const pct = Math.min(Math.round((collectedThisMonth / monthlyRevenue) * 100), 100);
  const barColor = pct >= 90 ? "bg-[#2D64C8]" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  const pctColor = pct >= 90 ? "text-[#2D64C8]" : pct >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold tabular-nums ${pctColor}`}>{pct}%</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {fmtKES(collectedThisMonth)} / {fmtKES(monthlyRevenue)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Occupancy cell ───────────────────────────────────────────────────────────

function OccupancyCell({ stats }: { stats: PropertyStats }) {
  const { totalUnits, occupiedUnits, vacantUnits } = stats;

  if (totalUnits === 0) {
    return <span className="text-xs text-muted-foreground">No units</span>;
  }

  const pct = Math.round((occupiedUnits / totalUnits) * 100);

  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tabular-nums">
          {occupiedUnits} / {totalUnits}
        </span>
        <span className="text-[11px] text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2D64C8] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground">{vacantUnits} vacant</span>
    </div>
  );
}

// ─── Mobile property card ─────────────────────────────────────────────────────

function PropertyCard({
  property,
  onClick,
}: {
  property: Property;
  onClick: () => void;
}) {
  const { stats } = property;
  const units = configuredUnits(property);
  const collectionPct =
    stats.monthlyRevenue > 0
      ? Math.min(Math.round((stats.collectedThisMonth / stats.monthlyRevenue) * 100), 100)
      : null;
  const pctColor =
    collectionPct === null
      ? ""
      : collectionPct >= 90
      ? "text-[#2D64C8]"
      : collectionPct >= 50
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div
      className="bg-white rounded-lg border p-4 flex flex-col gap-3 transition-colors cursor-pointer hover:bg-muted/30"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{property.propertyName}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="size-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {locationString(property) || "—"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">Units</span>
          <span className={`text-xs ${units > 0 ? "text-[#2D64C8] font-medium" : "text-muted-foreground"}`}>
            {units} {units === 1 ? "unit" : "units"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">Occupancy</span>
          {stats.totalUnits > 0 ? (
            <span className="text-xs font-medium">
              {stats.occupiedUnits} / {stats.totalUnits}
              <span className="text-muted-foreground font-normal"> · {stats.vacantUnits} vacant</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No units</span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-[11px] text-muted-foreground">Collection Rate</span>
          {collectionPct !== null ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${pctColor}`}>{collectionPct}%</span>
                <span className="text-[11px] text-muted-foreground">
                  {fmtKES(stats.collectedThisMonth)} / {fmtKES(stats.monthlyRevenue)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${collectionPct >= 90 ? "bg-[#2D64C8]" : collectionPct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No active leases</span>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        className="gap-1.5 text-xs h-8 px-3 w-full cursor-pointer hover:bg-white"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        Manage <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i} className="pointer-events-none">
          {[...Array(cols)].map((__, j) => (
            <TableCell key={j}>
              <div
                className="h-3.5 rounded bg-muted animate-pulse"
                style={{ width: j === cols - 1 ? 80 : "75%" }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [fetching, setFetching] = useState(true);

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load properties."))
      .finally(() => setFetching(false));
  }, []);

  const hasActiveFilters = globalFilter !== "";

  const clearFilters = () => {
    setGlobalFilter("");
  };

  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: "propertyName",
      size: 180,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Property Name <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.propertyName}</span>
      ),
    },
    {
      id: "location",
      size: 160,
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground tracking-wide">
          Location
        </span>
      ),
      accessorFn: (row) => locationString(row),
      cell: ({ row }) => {
        const loc = row.original.location;
        const label = locationString(row.original);
        const coords = loc.coordinates;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground">{label || "—"}</span>
            {coords && (
              <span className="text-[11px] font-mono text-muted-foreground/70">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "units",
      size: 120,
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground tracking-wide">
          Units
        </span>
      ),
      accessorFn: (row) => configuredUnits(row),
      cell: ({ row }) => {
        const units = configuredUnits(row.original);
        const types = row.original.unitTypes.length;
        return (
          <div className="flex flex-col gap-0.5">
            <span className={units > 0 ? "text-[#2D64C8] font-medium" : "text-muted-foreground"}>
              {units} {units === 1 ? "Unit" : "Units"}
            </span>
            {types > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {types} {types === 1 ? "type" : "types"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "collectionRate",
      size: 200,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Collection Rate <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      accessorFn: (row) =>
        row.stats.monthlyRevenue > 0
          ? row.stats.collectedThisMonth / row.stats.monthlyRevenue
          : -1,
      cell: ({ row }) => <CollectionRateCell stats={row.original.stats} />,
    },
    {
      id: "occupancy",
      size: 160,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Occupancy <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      accessorFn: (row) =>
        row.stats.totalUnits > 0
          ? row.stats.occupiedUnits / row.stats.totalUnits
          : -1,
      cell: ({ row }) => <OccupancyCell stats={row.original.stats} />,
    },
    {
      id: "actions",
      size: 100,
      header: () => <div className="text-left">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="gap-1.5 text-xs h-8 px-3 w-28 cursor-pointer hover:bg-white"
            onClick={() => router.push(`/properties/${row.original._id}`)}
          >
            Manage <ArrowRight className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredData = properties;

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility, columnFilters, pagination, globalFilter },
    getRowId: (row) => row._id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col bg-[#F0F4F8] w-full">
      <div className="p-4 flex flex-col gap-4">

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative bg-white rounded-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 pl-9 w-52 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              className="h-8 gap-1.5 text-xs font-normal text-muted-foreground border-border rounded-md hover:bg-black/5 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
              onClick={clearFilters}
            >
              <X className="size-3.5" /> Clear filters
            </Button>
          )}

          <Button
            className="ml-auto bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5 text-xs font-semibold h-8 px-3 w-36 cursor-pointer"
            onClick={() => router.push("/properties/new")}
          >
            <Plus className="size-3.5" /> New Property
          </Button>
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block rounded-lg border bg-white overflow-auto">
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold text-muted-foreground tracking-wide last:text-right"
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {fetching ? (
                <SkeletonRows cols={columns.length} />
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/properties/${row.original._id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="text-xs"
                        style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-xs text-muted-foreground"
                  >
                    No properties found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Mobile card list ── */}
        <div className="flex flex-col gap-3 md:hidden">
          {fetching ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border p-4 flex flex-col gap-3 animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-8 bg-muted rounded" />
                  <div className="h-8 bg-muted rounded" />
                </div>
                <div className="h-10 bg-muted rounded w-full" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <PropertyCard
                key={row.id}
                property={row.original}
                onClick={() => router.push(`/properties/${row.original._id}`)}
              />
            ))
          ) : (
            <div className="bg-white rounded-lg border h-24 flex items-center justify-center text-xs text-muted-foreground">
              No properties found.
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pb-2">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="rows-per-page" className="text-xs font-medium whitespace-nowrap">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-16" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium whitespace-nowrap">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="size-8"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}>
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}>
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-8"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}>
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
