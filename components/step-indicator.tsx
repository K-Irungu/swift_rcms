"use client";
import * as React from "react";
import { Check } from "lucide-react";

type Step = { number: number; label: string };

export function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: Step[];
}) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isDone = current > step.number;
        const isActive = current === step.number;
        return (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                  isDone
                    ? "bg-[#2D64C8] text-white"
                    : isActive
                      ? "bg-[#2D64C8] text-white ring-4 ring-[#2D64C8]/20"
                      : "bg-white border border-border text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="size-3.5" /> : step.number}
              </div>
              <span
                className={`text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-[#2D64C8] font-semibold"
                    : isDone
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3 mb-5">
                <div
                  className={`h-px transition-colors duration-300 ${
                    current > step.number ? "bg-[#2D64C8]" : "bg-border"
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}