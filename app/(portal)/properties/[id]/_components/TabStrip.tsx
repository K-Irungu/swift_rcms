import React from 'react'
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { Property } from '../_types';

import {
  ArrowLeft,
  MapPin,
  Building2,
  KeyRound,
  Edit2,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  Phone,
  User
} from "lucide-react";


const TabStrip = ({property, openSheet}: {property: Property; openSheet: () => void}) => {
      const router = useRouter();

      const units = property.unitTypes.reduce((acc, unitType) => acc + unitType.count, 0);
      const totalUnits = property.unitTypes.reduce((acc, unitType) => acc + unitType.count, 0);

      const [activeTab, setActiveTab] = React.useState<
        "overview" | "units" | "financials" | "maintenance"
      >("overview");
  return (

        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="px-4 pt-3 pb-0 flex flex-col gap-2.5">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back */}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 cursor-pointer"
                  onClick={() => router.push("/properties/all-properties")}
                >
                  <ArrowLeft className="size-3.5" />
                </Button>

          
                {/* Name + inline stats */}
                <div className="flex flex-col min-w-0">
                  <h1 className="text-sm font-semibold text-foreground leading-tight truncate">
                    {property.propertyName}
                  </h1>
                  <div className="flex items-center gap-1 flex-wrap">
                  
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
                onClick={openSheet}
              >
                <Edit2 className="size-3.5" /> Edit
              </Button>
            </div>

            {/* Tab strip */}
            <div className="flex items-center -mb-px">
              {(
                [
                  { key: "overview", label: "Overview" },
                  {
                    key: "units",
                    label: "Units",
                    count:
                      units || (totalUnits > 0 ? totalUnits : undefined),
                  },
                  { key: "financials", label: "Financials" },
                  { key: "maintenance", label: "Maintenance", count: 8 },
                ] as { key: typeof activeTab; label: string; count?: number }[]
              ).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
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
              ))}
            </div>
          </div>
        </div>
  )
}

export default TabStrip