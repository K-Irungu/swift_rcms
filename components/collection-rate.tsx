import { Card, CardHeader, CardContent } from "@/components/ui/card";

type PropertyCollection = {
  name: string;
  units: number;
  collected: number;
  target: number;
  percentage: number;
  status: "On Track" | "At Risk" | "Critical";
};

const properties: PropertyCollection[] = [
  {
    name: "Greenwood Apartments",
    units: 32,
    collected: 124000,
    target: 130000,
    percentage: 97,
    status: "On Track",
  },
  {
    name: "Parkview Heights",
    units: 28,
    collected: 88000,
    target: 112000,
    percentage: 79,
    status: "At Risk",
  },
  {
    name: "Riverside Block",
    units: 24,
    collected: 43200,
    target: 96000,
    percentage: 45,
    status: "Critical",
  },
];

const statusStyles: Record<PropertyCollection["status"], string> = {
  "On Track": "text-emerald-600 bg-emerald-50 border border-emerald-200",
  "At Risk": "text-amber-600 bg-amber-50 border border-amber-200",
  Critical: "text-red-600 bg-red-50 border border-red-200",
};

const progressColor: Record<PropertyCollection["status"], string> = {
  "On Track": "bg-blue-500",
  "At Risk": "bg-blue-500",
  Critical: "bg-blue-500",
};

export function CollectionRate() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b pb-3">
        <p className="text-sm font-semibold">Collection Rate by Property</p>
        <p className="text-xs uppercase font-extrabold tracking-[0.12em] text-muted-foreground/60">
          % of expected rent collected · March 2026
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4">
        {properties.map((property) => (
          <div key={property.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{property.name}</span>
                <span className="text-xs text-muted-foreground">
                  {property.units} units
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    statusStyles[property.status]
                  }`}
                >
                  {property.status}
                </span>
                <span className="text-sm font-bold tabular-nums w-8 text-right">
                  {property.percentage}%
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  KES {property.collected.toLocaleString()} /{" "}
                  {property.target.toLocaleString()}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor[property.status]}`}
                style={{ width: `${property.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}