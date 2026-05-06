"use client";

import { Wrench } from "lucide-react";

export function MaintenanceTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-lg border flex flex-col items-center justify-center py-16 gap-2">
        <Wrench className="size-6 text-muted-foreground/30" />
        <p className="text-xs font-medium text-foreground">Maintenance coming soon</p>
        <p className="text-[11px] text-muted-foreground">
          Work orders, request tracking, and vendor management will appear here.
        </p>
      </div>
    </div>
  );
}
