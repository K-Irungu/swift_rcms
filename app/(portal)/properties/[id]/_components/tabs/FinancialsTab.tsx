"use client";

import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FinancialsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Total Collected"
          value="KES 412,000"
          trend="up"
          trendLabel="8% more than last month"
          badge="85% collected"
        />
        <SummaryCard
          label="Total Expenditure"
          value="KES 98,000"
          trend="up"
          trendLabel="8% more than last month"
        />
        <SummaryCard
          label="Net Income"
          value="KES 314,000"
          trend="up"
          trendLabel="6% more than last month"
        />
      </div>

      <div className="bg-white rounded-lg border flex flex-col items-center justify-center py-16 gap-2">
        <DollarSign className="size-6 text-muted-foreground/30" />
        <p className="text-xs font-medium text-foreground">Financials coming soon</p>
        <p className="text-[11px] text-muted-foreground">
          Rent collection, expenses, and income reports will appear here.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  trend,
  trendLabel,
  badge,
}: {
  label: string;
  value: string;
  trend: "up" | "down";
  trendLabel: string;
  badge?: string;
}) {
  const Icon = trend === "up" ? TrendingUp : TrendingDown;
  const iconColor = trend === "up" ? "text-green-500" : "text-red-500";

  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {badge && (
          <Badge
            variant="outline"
            className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold"
          >
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <div className={`flex items-center gap-1 ${iconColor}`}>
        <Icon className="size-3" />
        <span className="text-[11px] font-medium">{trendLabel}</span>
      </div>
    </div>
  );
}
