"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";

export function ArrearsBanner() {
  const [loadingViewArrears, setLoadingViewArrears] = useState(false);

  const handleViewArrears = () => {
    setLoadingViewArrears(true);
    setTimeout(() => setLoadingViewArrears(false), 2000);
  };
  return (
    <Card className="flex flex-row items-center justify-between px-4 py-">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Outstanding Arrears · As of Today
        </p>
        <p className="text-xl font-semibold">KES 73,000</p>
        <p className="text-xs text-muted-foreground">
          4 Tenants · Oldest Debt: 47 Days
        </p>
      </div>
      <Button
        className="bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-2 cursor-pointer w-36 text-xs font-semibold"
        disabled={loadingViewArrears}
        onClick={handleViewArrears}
      >
        {loadingViewArrears ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            View Arrears <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </Card>
  );
}
