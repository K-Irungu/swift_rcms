"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

const currentMonth = "March 2026";

const statCards = [
  { label: "Total Properties", value: "24" },
  { label: "Total Units", value: "142" },
  { label: "Total Tenants", value: "118" },
];

const financialCards = [
  {
    label: "Total Collected",
    value: "KES 412,000",
    trend: "+8%",
    trendDirection: "up",
    badge: "85% collected",
    footer: "8% more than last month",
  },
  {
    label: "Total Expenditure",
    value: "KES 98,000",
    trend: "+8%",
    trendDirection: "up",
    footer: "8% more than last month",
  },
  {
    label: "Net Income",
    value: "KES 314,000",
    trend: "+6%",
    trendDirection: "up",
    footer: "6% more than last month",
  },
];

export function SectionCards() {
  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 — Count Cards */}
      <div className="grid grid-cols-1 gap-4   @xl/main:grid-cols-3 ">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="@container/card  cursor-pointer hover:bg-muted rounded-md transition-colors "
          >
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Row 2 — Financial Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3 ">
        {financialCards.map((card) => {
          const isUp = card.trendDirection === "up";
          const TrendIcon = isUp ? TrendingUpIcon : TrendingDownIcon;

          return (
            <Card
              key={card.label}
              className="@container/card hover:bg-muted rounded-md transition-colors cursor-pointer"
            >
              <CardHeader className=" ">
                <CardDescription>
                  {card.label} · {currentMonth}
                </CardDescription>
                <CardTitle className="text-xl font-semibold tabular-nums">
                  {card.value}
                </CardTitle>
              </CardHeader>
              <CardFooter
                className={`flex flex-1 ${card.badge ? "justify-between" : "justify-end"}  gap-1.5 text-sm`}
              >
                {" "}
                {card.badge && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">
                    {card.badge}
                  </Badge>
                )}
                <div className="line-clamp-1 flex gap-2 font-medium text-xs items-center">
                  <TrendIcon className="size-3" />
                  {card.footer}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
