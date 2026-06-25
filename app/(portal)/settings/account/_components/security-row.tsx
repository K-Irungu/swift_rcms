"use client";

import { ChevronRight } from "lucide-react";

type SecurityRowProps = {
  label: string;
  meta: string;
  onClick: () => void;
};

export function SecurityRow({ label, meta, onClick }: SecurityRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 border-b border-border last:border-b-0 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-4 px-4 transition-colors"
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{meta}</span>
      </div>
      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}