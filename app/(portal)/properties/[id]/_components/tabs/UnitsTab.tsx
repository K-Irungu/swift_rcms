"use client";

import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { StatCard } from "../../_ui";
import { formatKES } from "../../_lib";
import type { Property, Unit } from "../../_types";

type Props = {
  property: Property;
  units: Unit[];
  slug: string;
};

export function UnitsTab({ property, units, slug }: Props) {
  const router = useRouter();
  const [unitFilter, setUnitFilter] = useState<"all" | "occupied" | "vacant">("all");

  const totalUnits = property.unitTypes.reduce((sum, u) => sum + u.count, 0);
  const occupiedCount = units.filter((u) => u.occupancyStatus === "OCCUPIED").length;
  const vacantCount = units.filter((u) => u.occupancyStatus === "VACANT").length;

  const filtered = units.filter((u) =>
    unitFilter === "all"
      ? true
      : unitFilter === "occupied"
        ? u.occupancyStatus === "OCCUPIED"
        : u.occupancyStatus === "VACANT",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total Units"
          value={String(totalUnits)}
          sub={`${property.unitTypes.length} type${property.unitTypes.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Occupied"
          value={units.length > 0 ? String(occupiedCount) : "—"}
          sub={
            units.length > 0
              ? `${Math.round((occupiedCount / units.length) * 100)}% rate`
              : "No units yet"
          }
        />
        <StatCard
          label="Vacant"
          value={units.length > 0 ? String(vacantCount) : "—"}
          sub={
            vacantCount > 0
              ? "Available now"
              : units.length > 0
                ? "Fully occupied"
                : "No units yet"
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {(["all", "occupied", "vacant"] as const).map((f) => {
            const count =
              f === "all" ? units.length : f === "occupied" ? occupiedCount : vacantCount;
            return (
              <button
                key={f}
                onClick={() => setUnitFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  unitFilter === f
                    ? "bg-[#2D64C8] text-white border-[#2D64C8]"
                    : "bg-white text-muted-foreground border-border hover:border-[#2D64C8]/40"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {units.length > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          className="h-8 text-xs gap-1 cursor-pointer px-3"
          onClick={() => router.push(`/units/new?propertyId=${slug}`)}
        >
          <Plus className="size-3" /> Add Unit
        </Button>
      </div>

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
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-muted-foreground">No {unitFilter} units.</p>
            </div>
          ) : (
            <table className="w-full min-w-[520px] text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Unit", "Beds / Baths", "Rent / mo", "Deposit", "Status"].map((h) => (
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
                {filtered.map((unit) => (
                  <tr key={unit._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{unit.unitNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {unit.bedrooms}bd / {unit.bathrooms}ba
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
