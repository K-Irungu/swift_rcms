"use client";

import { useState, useMemo } from "react";
import { KeyRound, Plus, Search, X, ExternalLink, DoorOpen, DoorClosed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { formatKES } from "../../_lib";
import { Stats } from "../Stats";
import type { Property, Unit } from "../../_types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  property:      Property;
  units:         Unit[];
  slug:          string;
  onUnitUpdate:  (updated: Unit) => void;
};

type StatusFilter = "all" | "occupied" | "vacant";
type SortOption   =
  | "unitNumber_asc"
  | "unitNumber_desc"
  | "rentAmount_asc"
  | "rentAmount_desc"
  | "depositAmount_asc"
  | "depositAmount_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "unitNumber_asc",    label: "Unit Number (A → Z)" },
  { value: "unitNumber_desc",   label: "Unit Number (Z → A)" },
  { value: "rentAmount_asc",    label: "Rent: Low to High" },
  { value: "rentAmount_desc",   label: "Rent: High to Low" },
  { value: "depositAmount_asc", label: "Deposit: Low to High" },
  { value: "depositAmount_desc",label: "Deposit: High to Low" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function UnitsTab({ property, units, slug, onUnitUpdate }: Props) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search,       setSearch]       = useState("");
  const [sort,         setSort]         = useState<SortOption>("unitNumber_asc");
  const [toggling,     setToggling]     = useState<string | null>(null);

  const totalUnits    = units.length;
  const occupiedCount = units.filter((u) => u.occupancyStatus === "OCCUPIED").length;
  const vacantCount   = units.filter((u) => u.occupancyStatus === "VACANT").length;

  const hasActiveFilters = statusFilter !== "all" || search.trim() !== "";

  function clearFilters() {
    setStatusFilter("all");
    setSearch("");
  }

  async function toggleOccupancy(unit: Unit) {
    const next = unit.occupancyStatus === "OCCUPIED" ? "VACANT" : "OCCUPIED";
    setToggling(unit._id);
    try {
      const res  = await fetch(`/api/units/${unit._id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ occupancyStatus: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      onUnitUpdate({ ...unit, occupancyStatus: next });
    } catch (err) {
      const { default: toast } = await import("react-hot-toast");
      toast.error(err instanceof Error ? err.message : "Failed to update unit.");
    } finally {
      setToggling(null);
    }
  }

  const displayed = useMemo(() => {
    let list = units;

    if (statusFilter === "occupied") list = list.filter((u) => u.occupancyStatus === "OCCUPIED");
    if (statusFilter === "vacant")   list = list.filter((u) => u.occupancyStatus === "VACANT");

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((u) => u.unitNumber.toLowerCase().includes(q));

    const [field, dir] = sort.split("_") as ["unitNumber" | "rentAmount" | "depositAmount", "asc" | "desc"];

    list = [...list].sort((a, b) => {
      const cmp = field === "unitNumber"
        ? a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true, sensitivity: "base" })
        : a[field] - b[field];
      return dir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [units, statusFilter, search, sort]);

  return (
    <div className="flex flex-col gap-4">

      {/* 1. Stats */}
      <Stats
        property={property}
        totalUnits={totalUnits}
        occupiedCount={occupiedCount}
        vacantCount={vacantCount}
        units={units}
      />

      {/* 2. Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search — find first */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit…"
            className="h-8 pl-8 w-44 text-xs bg-white"
          />
        </div>

        {/* Status filter — narrow results */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 text-xs w-36 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="p-1 rounded-md">
            <SelectItem value="all"      className="text-xs cursor-pointer rounded-sm">All Statuses</SelectItem>
            <SelectItem value="occupied" className="text-xs cursor-pointer rounded-sm">Occupied ({occupiedCount})</SelectItem>
            <SelectItem value="vacant"   className="text-xs cursor-pointer rounded-sm">Vacant ({vacantCount})</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort — order results */}
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="h-8 text-xs w-52 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="p-1 rounded-md">
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sort by</div>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs cursor-pointer rounded-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear — only visible when filters are active */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3" /> Clear
          </button>
        )}

        {/* Add Unit — primary action, separated to the right */}
        <Button
          variant="outline"
          className="h-8 text-xs gap-1 cursor-pointer px-3 ml-auto"
          onClick={() => router.push(`/units/new?propertyId=${slug}`)}
        >
          <Plus className="size-3" /> Add Unit
        </Button>
      </div>

      {/* 3. Units table */}
      {units.length === 0 ? (
        <div className="bg-white rounded-lg border flex flex-col items-center justify-center py-16 gap-2">
          <KeyRound className="size-6 text-muted-foreground/30" />
          <p className="text-xs font-medium text-foreground">No units added yet</p>
          <p className="text-[11px] text-muted-foreground">
            Add units to start assigning tenants and tracking occupancy.
          </p>
          <Button
            variant="outline"
            className="h-8 text-xs gap-1.5 mt-2 cursor-pointer"
            onClick={() => router.push(`/units/new?propertyId=${slug}`)}
          >
            <Plus className="size-3.5" /> Add your first unit
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-xs text-muted-foreground">No units match your search or filter.</p>
              <button onClick={clearFilters} className="text-xs text-[#2D64C8] hover:underline cursor-pointer">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {["Unit", "Tenant", "Rent / mo", "Deposit", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-4 font-semibold text-muted-foreground tracking-wide border-b"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayed.map((unit) => (
                    <tr
                      key={unit._id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => router.push(`/units/${unit._id}`)}
                    >
                      <td className="py-3 px-4 font-medium">{unit.unitNumber}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {unit.currentTenant
                          ? <span className="text-foreground font-medium">{unit.currentTenant.fullName}</span>
                          : <span className="text-muted-foreground/40">—</span>
                        }
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#2D64C8]">
                        {formatKES(unit.rentAmount)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatKES(unit.depositAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            unit.occupancyStatus === "OCCUPIED"
                              ? "bg-green-50 text-green-700 border-[0.5px] border-green-500 text-xs font-semibold"
                              : "text-xs font-semibold border-none text-muted-foreground"
                          }
                        >
                          {unit.occupancyStatus === "OCCUPIED" ? "Occupied" : "Vacant"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Manage unit"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-[#2D64C8] hover:bg-[#2D64C8]/10 transition-colors cursor-pointer"
                            onClick={() => router.push(`/units/${unit._id}`)}
                          >
                            <ExternalLink className="size-3.5" />
                          </button>
                          {/* <button
                            title={unit.occupancyStatus === "OCCUPIED" ? "Mark as vacant" : "Mark as occupied"}
                            disabled={toggling === unit._id}
                            className={`p-1.5 rounded-md text-muted-foreground transition-colors cursor-pointer disabled:opacity-50 ${
                              unit.occupancyStatus === "OCCUPIED"
                                ? "hover:text-red-600 hover:bg-red-50"
                                : "hover:text-green-600 hover:bg-green-50"
                            }`}
                            onClick={() => toggleOccupancy(unit)}
                          >
                            {toggling === unit._id
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : unit.occupancyStatus === "OCCUPIED"
                                ? <DoorOpen className="size-3.5" />
                                : <DoorClosed className="size-3.5" />
                            }
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
