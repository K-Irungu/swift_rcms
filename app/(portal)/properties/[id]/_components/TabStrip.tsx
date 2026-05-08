"use client";

import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { Property, TabKey, Unit } from "../_types";

type Props = {
  property: Property;
  units: Unit[];
  tenantCount: number;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onEdit: () => void;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",    label: "Details" },
  { key: "units",       label: "Units" },
  { key: "tenants",     label: "Tenants" },
  { key: "finance",     label: "Billing & Finance" },
  { key: "maintenance", label: "Maintenance" },
];

export function TabStrip({ property, units, tenantCount, activeTab, onTabChange, onEdit }: Props) {
  const router = useRouter();
  function tabCount(key: TabKey): number | undefined {
    if (key === "units")   return units.length   || undefined;
    if (key === "tenants") return tenantCount     || undefined;
    return undefined;
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b">
      <div className="px-4 pt-3 pb-0 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 cursor-pointer"
              onClick={() => router.push("/properties/all-properties")}
            >
              <ArrowLeft className="size-3.5" />
            </Button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-semibold text-foreground leading-tight truncate">
                {property.propertyName}
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
            onClick={onEdit}
          >
            <Edit2 className="size-3.5" /> Edit
          </Button>
        </div>

        <div className="flex items-center -mb-px">
          {TABS.map(({ key, label }) => {
            const count = tabCount(key);
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? "border-[#2D64C8] text-[#2D64C8]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {count !== undefined && (
                  <span
                    className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      activeTab === key
                        ? "bg-[#2D64C8]/10 text-[#2D64C8]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
