"use client";

import { useState, useEffect } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

type WaterRate = {
  _id: string;
  ratePerUnit: number;
  effectiveFrom: string;
  createdAt: string;
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type Props = { slug: string };

export function BillingTab({ slug }: Props) {
  const [current,    setCurrent]    = useState<WaterRate | null>(null);
  const [history,    setHistory]    = useState<WaterRate[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [rateInput,  setRateInput]  = useState("");
  const [dateInput,  setDateInput]  = useState(todayISO());
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${slug}/water-rate`)
      .then((r) => r.json())
      .then((j) => {
        setCurrent(j.data?.current ?? null);
        setHistory(j.data?.history ?? []);
      })
      .catch(() => toast.error("Failed to load water rate."))
      .finally(() => setLoading(false));
  }, [slug]);

  async function save() {
    const rate = Number(rateInput);
    if (!rateInput || isNaN(rate) || rate < 0) {
      toast.error("Enter a valid rate per unit.");
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch(`/api/properties/${slug}/water-rate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ratePerUnit: rate, effectiveFrom: dateInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to set rate");
      const newRate: WaterRate = json.data;
      setCurrent(newRate);
      setHistory((prev) => [newRate, ...prev]);
      setRateInput("");
      setDateInput(todayISO());
      toast.success("Water rate updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set rate.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Current rate */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-semibold">Current Water Rate</h3>
        </div>
        {current ? (
          <div className="flex  gap-6">
            <div className="">
              <p className="text-[11px] text-muted-foreground mb-0.5">Rate per unit</p>
              <p className="text-sm font-medium ">
                KES {current.ratePerUnit.toLocaleString("en-KE")}
              </p>
            </div>
            <div className="flex flex-col  justify-between">
              <p className="text-[11px] text-muted-foreground ">Effective from</p>
              <p className="text-sm font-medium">{fmtDate(current.effectiveFrom)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 text-muted-foreground">
            <Droplets className="size-4 text-muted-foreground/30" />
            <p className="text-xs">No water rate set for this property yet.</p>
          </div>
        )}
      </div>

      {/* Set new rate */}
      <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
        <h3 className="text-xs font-semibold">Set New Rate</h3>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Each new entry is saved as a separate record so historical readings remain accurate.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Rate per unit (KES) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="e.g. 50"
              className="h-8 text-xs w-40"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Effective from</label>
            <Input
              type="date"
              className="h-8 text-xs w-40"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <Button
            className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5"
            disabled={!rateInput || saving}
            onClick={save}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : ""}
            {saving ? "Saving…" : "Set Rate"}
          </Button>
        </div>
      </div>

      {/* Rate history */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-semibold">Rate History</h3>
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5">
            <Droplets className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No rates recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Effective From", "Rate per Unit", "Set On"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">
                      {h}
                    </th>
                  ))}
                  <th className="py-2.5 px-4 border-b" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((r, i) => (
                  <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{fmtDate(r.effectiveFrom)}</td>
                    <td className="py-3 px-4 font-semibold text-[#2D64C8] tabular-nums">
                      KES {r.ratePerUnit.toLocaleString("en-KE")}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    <td className="py-3 px-4">
                      {i === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Current
                        </span>
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
  );
}
