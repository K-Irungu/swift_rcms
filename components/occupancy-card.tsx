import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDownIcon, ArrowRight } from "lucide-react";

const totalUnits = 142;
const occupiedUnits = 118;
const vacantUnits = totalUnits - occupiedUnits;
const currentMonth = "March 2026";

export function OccupancyCard() {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="border-b pb-3">
        <p className="text-xs font-semibold">Occupancy</p>
        <p className="text-xs text-muted-foreground">
          {totalUnits} units total · {currentMonth}
        </p>
      </CardHeader>
      <CardContent className="pt-4 ">
        <div className="grid grid-cols-2 divide-x rounded-md border">
          <div className="flex flex-col items-center justify-center py-6 gap-1">
            <span className="text-4xl font-bold tabular-nums">{occupiedUnits}</span>
            <span className="text-xs text-muted-foreground ">
              Occupied units
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 gap-1">
            <span className="text-4xl font-bold tabular-nums">{vacantUnits}</span>
            <span className="text-xs text-muted-foreground ">
              Vacant units
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs ">
          <TrendingDownIcon className="size-3" />
          3% occupancy vs last month
        </span>
        <Button variant="outline" className="gap-1.5 text-xs font-semibold h-8 px-3 cursor-pointer">
          View Vacant Units <ArrowRight className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
