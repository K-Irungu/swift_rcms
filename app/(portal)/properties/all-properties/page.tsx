"use client";
import * as React from "react";
import { useState } from "react";
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
import { format } from "date-fns";
import {
  CalendarIcon,
  Search,
  Plus,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  X,
  MapPin,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

type PropertyStatus = "Active" | "Pending";

type Property = {
  id: number;
  createdAt: Date;
  name: string;
  type: string;
  status: PropertyStatus;
  purpose: string;
  location: string;
  units: number;
  occupied: number;
  vacant: number;
};

const properties: Property[] = [
  {
    id: 1,
    createdAt: new Date("2026-03-06T12:06:00"),
    name: "Test 1",
    type: "Apartment",
    status: "Active",
    purpose: "Rent",
    location: "Nairobi, Nairobi City",
    units: 1,
    occupied: 1,
    vacant: 0,
  },
  {
    id: 2,
    createdAt: new Date("2026-03-03T18:19:00"),
    name: "Genesis House",
    type: "Apartment",
    status: "Pending",
    purpose: "Short-Stay",
    location: "Dar es Salaam, Dar es Salaam",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 3,
    createdAt: new Date("2026-02-23T11:19:00"),
    name: "Ridgeways Apartments",
    type: "Apartment",
    status: "Active",
    purpose: "Rent",
    location: "Kiambu, Kiambu",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 4,
    createdAt: new Date("2026-02-12T13:56:00"),
    name: "abx",
    type: "Apartment",
    status: "Pending",
    purpose: "Rent",
    location: "Nairobi, Nairobi City",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 5,
    createdAt: new Date("2026-02-12T10:01:00"),
    name: "Aptech Office Block",
    type: "Apartment",
    status: "Pending",
    purpose: "Rent",
    location: "Nairobi, Nairobi City",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 6,
    createdAt: new Date("2026-02-05T22:44:00"),
    name: "ZyX",
    type: "Apartment",
    status: "Pending",
    purpose: "Rent",
    location: "Ghormach, Badghis",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 7,
    createdAt: new Date("2026-01-23T23:17:00"),
    name: "New Test By DEv",
    type: "Apartment",
    status: "Active",
    purpose: "Rent",
    location: ", Nairobi City",
    units: 1,
    occupied: 1,
    vacant: 0,
  },
  {
    id: 8,
    createdAt: new Date("2026-01-20T22:47:00"),
    name: "Dennis Test",
    type: "Apartment",
    status: "Pending",
    purpose: "Rent",
    location: "Nairobi, Nakuru",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 9,
    createdAt: new Date("2026-01-16T21:10:00"),
    name: "Test 001",
    type: "Apartment",
    status: "Active",
    purpose: "Rent",
    location: "Boston, Baghlan",
    units: 4,
    occupied: 1,
    vacant: 3,
  },
  {
    id: 10,
    createdAt: new Date("2026-01-14T14:59:00"),
    name: "bhuhhub",
    type: "Apartment",
    status: "Pending",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 11,
    createdAt: new Date("2026-01-14T14:59:00"),
    name: "bhuhhub",
    type: "Apartment",
    status: "Pending",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 12,
    createdAt: new Date("2026-01-14T14:59:00"),
    name: "bhuhhub",
    type: "Apartment",
    status: "Pending",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 13,
    createdAt: new Date("2026-01-14T14:59:00"),
    name: "bhuhhub",
    type: "Apartment",
    status: "Pending",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 14,
    createdAt: new Date("2026-01-14T14:59:00"),
    name: "bhuhhub",
    type: "Apartment",
    status: "Pending",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
  {
    id: 15,
    createdAt: new Date("2026-01-14T14:59:00"),
    name: "bhuhhub",
    type: "Apartment",
    status: "Pending",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
];

const statusStyles: Record<PropertyStatus, string> = {
  Active:
    "bg-green-50 text-green-700 border-[0.5px] border-green-500 text-center px-4",
  Pending: "border-none text-center",
};

function OccupancyCell({ property }: { property: Property }) {
  if (property.units === 0) {
    return (
      <Badge
        variant="outline"
        className="border-none text-xs text-muted-foreground"
      >
        0% occupied
      </Badge>
    );
  }
  const pct = Math.round((property.occupied / property.units) * 100);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge
        variant="outline"
        className="border-none text-xs text-muted-foreground"
      >
        {pct}% occupied
      </Badge>
    </div>
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3 ml-1 inline-block" />;
  if (sorted === "desc")
    return <ArrowDown className="size-3 ml-1 inline-block" />;
  return <ArrowUpDown className="size-3 ml-1 inline-block opacity-40" />;
}

// ─── Mobile property card ────────────────────────────────────────────────────
function PropertyCard({
  property,
  selected,
  onSelect,
  onManage,
  loading,
}: {
  property: Property;
  selected: boolean;
  onSelect: (val: boolean) => void;
  onManage: () => void;
  loading: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg border p-4 flex flex-col gap-3 transition-colors ${selected ? "border-blue-300 bg-blue-50/30" : ""}`}
    >
      {/* Header row: checkbox + name + status */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(val) => onSelect(!!val)}
          aria-label="Select row"
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{property.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(property.createdAt, "MMM d, yyyy, h:mm aa")}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs font-semibold border shrink-0 ${statusStyles[property.status]}`}
        >
          {property.status}
        </Badge>
      </div>

      {/* Detail rows */}
      <div className="flex flex-col gap-1.5 pl-7">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {property.location || "—"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3 text-muted-foreground shrink-0" />
          <span
            className={`text-xs ${property.units > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}`}
          >
            {property.units} {property.units === 1 ? "Unit" : "Units"}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <OccupancyCell property={property} />
        </div>
      </div>

      {/* Action */}
      <div className="pl-7">
        <Button
          variant="outline"
          className="gap-1.5 text-xs h-8 px-3 w-full cursor-pointer hover:bg-white"
          disabled={loading}
          onClick={onManage}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              Manage <ArrowRight className="size-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [loadingNewProperty, setLoadingNewProperty] = useState(false);
  const [loadingManageId, setLoadingManageId] = useState<number | null>(null);

  const handleNewProperty = () => {
    setLoadingNewProperty(true);
    setTimeout(() => setLoadingNewProperty(false), 2000);
  };

  const handleManage = (id: number) => {
    setLoadingManageId(id);
    setTimeout(() => setLoadingManageId(null), 2000);
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    !!dateFilter.from ||
    !!dateFilter.to ||
    globalFilter !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter({ from: undefined, to: undefined });
    setGlobalFilter("");
  };

  const columns: ColumnDef<Property>[] = [
    {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "createdAt",
      size: 180,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(row.original.createdAt, "MMM d, yyyy, h:mm aa")}
        </span>
      ),
    },
    {
      accessorKey: "name",
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
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "status",
      size: 100,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`text-xs font-semibold border ${statusStyles[row.original.status]}`}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "location",
      size: 200,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Location <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.location}</span>
      ),
    },
    {
      accessorKey: "units",
      size: 80,
      header: ({ column }) => (
        <button
          className="flex items-center text-xs font-semibold text-muted-foreground tracking-wide hover:text-foreground transition-colors cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Units <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span
          className={
            row.original.units > 0
              ? "text-blue-600 font-medium"
              : "text-muted-foreground"
          }
        >
          {row.original.units} {row.original.units === 1 ? "Unit" : "Units"}
        </span>
      ),
    },
    {
      id: "occupancy",
      size: 200,
      header: "Occupancy",
      cell: ({ row }) => <OccupancyCell property={row.original} />,
    },
    {
      id: "actions",
      size: 150,
      header: () => <div className="">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="gap-1.5 text-xs h-8 px-3 w-36 cursor-pointer hover:bg-white"
            disabled={loadingManageId === row.original.id}
            onClick={() => handleManage(row.original.id)}
          >
            {loadingManageId === row.original.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                Manage <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  const filteredData = React.useMemo(() => {
    return properties.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (dateFilter.from && p.createdAt < dateFilter.from) return false;
      if (dateFilter.to) {
        const toEnd = new Date(dateFilter.to);
        toEnd.setHours(23, 59, 59, 999);
        if (p.createdAt > toEnd) return false;
      }
      return true;
    });
  }, [statusFilter, dateFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white h-8 w-36 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 text-muted-foreground cursor-pointer">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent
              className="p-1 min-w-36 rounded-md"
              position="popper"
            >
              <SelectItem
                className="text-xs cursor-pointer rounded-sm"
                value="all"
              >
                All Statuses
              </SelectItem>
              <SelectItem
                className="text-xs cursor-pointer rounded-sm"
                value="Active"
              >
                Active
              </SelectItem>
              <SelectItem
                className="text-xs cursor-pointer rounded-sm"
                value="Pending"
              >
                Pending
              </SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-2 text-xs font-normal text-muted-foreground border-border rounded-md hover:bg-black/5 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                {dateFilter.from && dateFilter.to
                  ? `${format(dateFilter.from, "MMM d")} – ${format(dateFilter.to, "MMM d, yyyy")}`
                  : dateFilter.from
                    ? `From ${format(dateFilter.from, "MMM d, yyyy")}`
                    : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 [&_*]:text-xs" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateFilter.from, to: dateFilter.to }}
                onSelect={(range) =>
                  setDateFilter({ from: range?.from, to: range?.to })
                }
                initialFocus
                numberOfMonths={2}
                className="text-xs"
              />
              {(dateFilter.from || dateFilter.to) && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() =>
                      setDateFilter({ from: undefined, to: undefined })
                    }
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

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
            disabled={loadingNewProperty}
            onClick={handleNewProperty}
          >
            {loadingNewProperty ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="size-3.5" /> New Property
              </>
            )}
          </Button>
        </div>

        {/* ── Desktop table (md+) ── */}
        <div className="hidden md:block rounded-lg border bg-white h-[600px] overflow-auto">
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold text-muted-foreground tracking-wide last:text-center"
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="text-xs"
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
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

        {/* ── Mobile card list (< md) ── */}
        <div className="flex flex-col gap-3 md:hidden">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <PropertyCard
                key={row.id}
                property={row.original}
                selected={row.getIsSelected()}
                onSelect={(val) => row.toggleSelected(val)}
                onManage={() => handleManage(row.original.id)}
                loading={loadingManageId === row.original.id}
              />
            ))
          ) : (
            <div className="bg-white rounded-lg border h-24 flex items-center justify-center text-xs text-muted-foreground">
              No properties found.
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <p className="text-xs text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="rows-per-page"
                className="text-xs font-medium whitespace-nowrap"
              >
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-16" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
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
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
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