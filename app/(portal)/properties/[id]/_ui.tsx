import React from "react";
import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

// ─── Map panner (must live inside <Map>) ──────────────────────────────────────

export function MapPanner({
  coordinates,
}: {
  coordinates: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const prev = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!map || !coordinates) return;
    if (
      prev.current?.lat === coordinates.lat &&
      prev.current?.lng === coordinates.lng
    )
      return;
    prev.current = coordinates;
    map.panTo(coordinates);
    map.setZoom(15);
  }, [map, coordinates]);
  return null;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold text-foreground tabular-nums">
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

// Field Label

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
      {children}
    </label>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Pulse className="size-8 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Pulse className="h-4 w-48 rounded" />
            <Pulse className="h-3 w-32 rounded" />
          </div>
        </div>
        <Pulse className="h-44 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Pulse key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Pulse className="h-52 rounded-lg" />
            <Pulse className="h-64 rounded-lg" />
          </div>
          <div className="flex flex-col gap-4">
            <Pulse className="h-64 rounded-lg" />
            <Pulse className="h-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
