"use client";

import { useEffect, useState } from "react";
import { Droplets, Loader2, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKES } from "../_lib";
import type { Unit } from "../_types";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaterReading = {
  _id:             string;
  readingDate:     string;
  reading:         number;
  previousReading: number;
  consumption:     number;
  rateUsed:        number;
  amount:          number;
  invoiceId:       string | null;
};

type WaterRate = {
  _id:           string;
  ratePerUnit:   number;
  effectiveFrom: string;
} | null;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  unit:        Unit | null;
  propertySlug: string;
  open:        boolean;
  onClose:     () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaterReadingSheet({ unit, propertySlug, open, onClose }: Props) {

  // ─── State ──────────────────────────────────────────────────────────────────

  const [readings,      setReadings]      = useState<WaterReading[]>([]);
  const [currentRate,   setCurrentRate]   = useState<WaterRate>(null);
  const [loading,       setLoading]       = useState(false);

  const [readingInput,  setReadingInput]  = useState("");
  const [dateInput,     setDateInput]     = useState(todayInputValue());
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // ─── Derived values ──────────────────────────────────────────────────────────

  const lastReading     = readings[0] ?? null;
  const previousReading = lastReading?.reading ?? 0;
  const parsedInput     = Number(readingInput);
  const inputValid      = readingInput !== "" && !isNaN(parsedInput) && parsedInput >= previousReading;
  const consumption     = inputValid ? parsedInput - previousReading : null;
  const previewAmount   = consumption !== null && currentRate ? consumption * currentRate.ratePerUnit : null;

  // ─── Fetch on open ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !unit) return;

    setReadingInput("");
    setDateInput(todayInputValue());
    setError(null);

    async function fetchData() {
      setLoading(true);
      try {
        const [readingsRes, rateRes] = await Promise.all([
          fetch(`/api/units/${unit!._id}/water-readings`),
          fetch(`/api/properties/${propertySlug}/water-rate`),
        ]);

        if (readingsRes.ok) {
          const json = await readingsRes.json();
          setReadings(json.data ?? []);
        }

        if (rateRes.ok) {
          const json = await rateRes.json();
          setCurrentRate(json.data?.current ?? null);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, unit, propertySlug]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!unit || !inputValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const res  = await fetch(`/api/units/${unit._id}/water-readings`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reading: parsedInput, readingDate: dateInput }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Failed to record reading");
        return;
      }

      // Prepend the new reading and reset the form
      setReadings((prev) => [json.data, ...prev]);
      setReadingInput("");
      setDateInput(todayInputValue());
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden">

        {/* Header */}
        <SheetHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Droplets className="size-4 text-[#2D64C8] shrink-0" />
            <SheetTitle className="text-sm">
              Water Readings · Unit {unit?.unitNumber}
            </SheetTitle>
          </div>
          {currentRate && (
            <SheetDescription className="text-[11px]">
              Current rate: <span className="font-semibold text-foreground">{formatKES(currentRate.ratePerUnit)} / unit</span>
              {" "}· effective {formatDate(currentRate.effectiveFrom)}
            </SheetDescription>
          )}
        </SheetHeader>

        {loading ? (

          // ─── Loading ────────────────────────────────────────────────────────
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>

        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-0">

            {/* ─── No rate warning ─────────────────────────────────────────── */}
            {!currentRate && (
              <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-amber-800">No water rate configured</p>
                  <p className="text-[11px] text-amber-700">
                    Set a water rate for this property before recording readings.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Last reading summary ─────────────────────────────────────── */}
            {lastReading && (
              <div className="mx-4 mt-4 rounded-lg border bg-muted/20 p-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Last reading</span>
                  <span className="text-sm font-semibold tabular-nums">{lastReading.reading.toLocaleString("en-KE")} units</span>
                  <span className="text-[11px] text-muted-foreground">{formatDate(lastReading.readingDate)}</span>
                </div>
                <div className="text-right flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Consumption</span>
                  <span className="text-sm font-semibold tabular-nums">{lastReading.consumption.toLocaleString("en-KE")} units</span>
                  <span className="text-[11px] font-medium text-[#2D64C8]">{formatKES(lastReading.amount)}</span>
                </div>
              </div>
            )}

            {/* ─── Record new reading ───────────────────────────────────────── */}
            {currentRate && (
              <div className="mx-4 mt-4 rounded-lg border bg-white p-3 flex flex-col gap-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Record New Reading
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {/* Meter value */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Current Reading <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={previousReading}
                      placeholder={String(previousReading)}
                      className="h-8 text-xs"
                      value={readingInput}
                      onChange={(e) => { setReadingInput(e.target.value); setError(null); }}
                    />
                    {readingInput !== "" && parsedInput < previousReading && (
                      <p className="text-[11px] text-red-500">Must be ≥ {previousReading.toLocaleString("en-KE")}</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Reading Date</label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                    />
                  </div>
                </div>

                {/* Live preview */}
                {consumption !== null && previewAmount !== null && (
                  <div className="rounded-md bg-[#2D64C8]/5 border border-[#2D64C8]/20 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {consumption.toLocaleString("en-KE")} units × {formatKES(currentRate.ratePerUnit)}
                    </span>
                    <span className="text-xs font-semibold text-[#2D64C8]">
                      {formatKES(previewAmount)}
                    </span>
                  </div>
                )}

                {error && <p className="text-[11px] text-red-500">{error}</p>}

                <Button
                  className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer"
                  disabled={!inputValid || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Record Reading"}
                </Button>
              </div>
            )}

            {/* ─── Reading history ──────────────────────────────────────────── */}
            <div className="mx-4 mt-4 mb-4 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">History</p>

              {readings.length === 0 ? (
                <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-8 gap-1.5">
                  <Droplets className="size-5 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No readings recorded yet.</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
                    <thead className="bg-muted/50">
                      <tr>
                        {["Date", "Reading", "Units", "Amount", ""].map((h) => (
                          <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground tracking-wide text-[11px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {readings.map((r) => (
                        <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground">{formatDate(r.readingDate)}</td>
                          <td className="py-2.5 px-3 font-medium tabular-nums">{r.reading.toLocaleString("en-KE")}</td>
                          <td className="py-2.5 px-3 tabular-nums">{r.consumption.toLocaleString("en-KE")}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#2D64C8] tabular-nums">{formatKES(r.amount)}</td>
                          <td className="py-2.5 px-3">
                            {r.invoiceId ? (
                              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">Billed</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}
