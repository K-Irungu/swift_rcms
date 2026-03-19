"use client";

import * as React from "react";
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
import { CalendarIcon, ChevronDown, Plus, Search } from "lucide-react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
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

type PropertyStatus = "ACTIVE" | "PENDING";

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
    status: "ACTIVE",
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
    status: "PENDING",
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
    status: "ACTIVE",
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
    status: "PENDING",
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
    status: "PENDING",
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
    status: "PENDING",
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
    status: "ACTIVE",
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
    status: "PENDING",
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
    status: "ACTIVE",
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
    status: "PENDING",
    purpose: "Lease",
    location: "Pru West, Bono East",
    units: 0,
    occupied: 0,
    vacant: 0,
  },
];

const statusStyles: Record<PropertyStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  PENDING: "bg-blue-600 text-white border-blue-600",
};

function OccupancyCell({ property }: { property: Property }) {
  if (property.units === 0) {
    return (
      <Badge
        variant="outline"
        className="bg-orange-50 text-orange-600 border-orange-200 text-xs"
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
        className="bg-orange-50 text-orange-600 border-orange-200 text-xs"
      >
        {pct}% occupied
      </Badge>
      {property.occupied > 0 && (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 text-xs"
        >
          {property.occupied} occupied
        </Badge>
      )}
      {property.vacant > 0 && (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-500 border-red-200 text-xs"
        >
          {property.vacant} vacant
        </Badge>
      )}
    </div>
  );
}

const columns: ColumnDef<Property>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
    header: "CREATED",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {format(row.original.createdAt, "MMM d, yyyy, h:mm aa")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "PROPERTY NAME",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "PROPERTY TYPE",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.type}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <Badge
        className={`text-xs font-semibold border ${statusStyles[row.original.status]}`}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "purpose",
    header: "PURPOSE",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.purpose}
      </span>
    ),
  },
  {
    accessorKey: "location",
    header: "LOCATION",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.location}
      </span>
    ),
  },
  {
    accessorKey: "units",
    header: "UNITS",
    cell: ({ row }) => (
      <span
        className={`text-sm ${row.original.units > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}`}
      >
        {row.original.units} {row.original.units === 1 ? "Unit" : "Units"}
      </span>
    ),
  },
  {
    id: "occupancy",
    header: "OCCUPANCY",
    cell: ({ row }) => <OccupancyCell property={row.original} />,
  },
];

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
  }>({
    from: undefined,
    to: undefined,
  });
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

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
    <div className="flex flex-col bg-[#F0F4F8] h-full">
      {/* Card */}
      <div className="p-4 flex flex-col gap-4">
        {/* <h1 className="text-2xl font-bold">Properties</h1> */}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white h-8 w-36 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 text-muted-foreground cursor-pointer">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent
              className="p-1 min-w-36 rounded-md"
              position="popper"
            >
              {" "}
              <SelectItem
                className="text-xs cursor-pointer rounded-sm"
                value="all"
              >
                All Statuses
              </SelectItem>
              <SelectItem
                className="text-xs cursor-pointer rounded-sm"
                value="ACTIVE"
              >
                Active
              </SelectItem>
              <SelectItem
                className="text-xs cursor-pointer rounded-sm"
                value="PENDING"
              >
                Pending
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date filter */}
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
          onClick={() => setDateFilter({ from: undefined, to: undefined })}
        >
          Clear dates
        </Button>
      </div>
    )}
  </PopoverContent>
</Popover>

          {/* Search */}
          <div className="relative  bg-white rounded-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 pl-9 w-52 text-xs! border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs "
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold text-muted-foreground tracking-wide"
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
                      <TableCell key={cell.id}>
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
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No properties found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="rows-per-page"
                className="text-sm font-medium whitespace-nowrap"
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
            <span className="text-sm font-medium whitespace-nowrap">
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
  );
}
