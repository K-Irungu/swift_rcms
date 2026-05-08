
import { Property, Unit } from "../_types";
import { StatCard } from "../_ui";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  property: Property;
  totalUnits: number;
  occupiedCount: number;
  vacantCount: number;
  units: Unit[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Stats = ({
  property,
  totalUnits,
  occupiedCount,
  vacantCount,
  units,
}: Props) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Unit Types"
        value={String(property.unitTypes.length)}
        sub={`${totalUnits} total unit${totalUnits !== 1 ? "s" : ""}`}
      />
      <StatCard
        label="Total Tenants"
        value={units.length > 0 ? String(occupiedCount) : "—"}
        sub={
          units.length > 0
            ? `Active lease${occupiedCount !== 1 ? "s" : ""}`
            : "No leases yet"
        }
      />
      <StatCard
        label="Occupied"
        value={units.length > 0 ? String(occupiedCount) : "—"}
        sub={
          units.length > 0
            ? `${Math.round((occupiedCount / units.length) * 100)}%`
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
  );
};
