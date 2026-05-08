"use client";

import * as React from "react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StepIndicator } from "@/components/step-indicator";
import {
  ArrowLeft, ArrowRight, Plus, Check, Loader2, ImagePlus, X,
  Upload, AlertTriangle, Sparkles, Info, Layers, Square,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgreementTerms = {
  leaseDurationMonths?: number;
  noticePeriodDays?:    number;
  keyRules?:            string[];
};

type UnitTypeOption = {
  _id:               string;
  name:              string;
  rentAmount:        number;
  depositAmount:     number;
  agreementFilename?: string;
  agreementTerms?:   AgreementTerms;
};

type PropertyOption = {
  slug:       string;
  name:       string;
  rentDueDay: number;
  unitTypes:  UnitTypeOption[];
};

// Single mode
type Step1Data = {
  propertySlug:  string;
  unitNumber:    string;
  unitType:      string;
  unitTypeId:    string;
  status:        "vacant" | "occupied" | "";
  rentAmount:    string;
  depositAmount: string;
};

// Batch mode
type BatchMethod = "range" | "manual";
type BatchStep1Data = {
  propertySlug:  string;
  unitType:      string;
  unitTypeId:    string;
  status:        "vacant" | "occupied" | "";
  rentAmount:    string;
  depositAmount: string;
  method:        BatchMethod;
  // range
  prefix:        string;
  rangeFrom:     string;
  rangeTo:       string;
  // manual
  manualInput:   string;
};

type Step2Data = {
  leaseDurationMonths: string;
  noticePeriodDays:    string;
  paymentDay:          string;
  keyRules:            string[];
  termsSource:         "extracted" | "manual" | "none";
};

type UnitImage = { id: string; file: File; preview: string; description: string };
type Step3Data = { images: UnitImage[] };

type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Batch result
type BatchResult = { created: string[]; skipped: string[]; total: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const SINGLE_STEPS = [
  { number: 1, label: "Details" },
  { number: 2, label: "Lease Terms" },
  { number: 3, label: "Images" },
];
const BATCH_STEPS = [
  { number: 1, label: "Configure" },
  { number: 2, label: "Lease Terms" },
];

const MAX_BATCH = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: string) {
  const d = parseInt(n);
  if (isNaN(d)) return n;
  const s = ["th", "st", "nd", "rd"];
  const v = d % 100;
  return `${d}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function parseBatchUnitNumbers(data: BatchStep1Data): string[] {
  if (data.method === "range") {
    const from = parseInt(data.rangeFrom);
    const to   = parseInt(data.rangeTo);
    if (!data.prefix.trim() || isNaN(from) || isNaN(to) || from > to) return [];
    return Array.from({ length: to - from + 1 }, (_, i) => `${data.prefix.trim()}${from + i}`);
  }
  return data.manualInput
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate
}

function termsToStep2(terms: AgreementTerms, source: "extracted" | "manual"): Partial<Step2Data> {
  return {
    leaseDurationMonths: terms.leaseDurationMonths != null ? String(terms.leaseDurationMonths) : "",
    noticePeriodDays:    terms.noticePeriodDays    != null ? String(terms.noticePeriodDays)    : "",
    keyRules:            terms.keyRules ?? [],
    termsSource:         source,
  };
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, required, hint, error, children,
}: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Shared property + unit-type selectors ────────────────────────────────────

function PropertySelect({
  value, onChange, properties, loading, locked, error,
}: {
  value: string; onChange: (v: string) => void;
  properties: PropertyOption[]; loading: boolean; locked: boolean; error?: string;
}) {
  return (
    <Field label="Property" required error={error}>
      <div className="flex items-center gap-1.5">
        <Select value={value} onValueChange={onChange} disabled={loading || locked}>
          <SelectTrigger className={`flex-1 h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${error ? "border-red-400" : ""} ${locked ? "opacity-70 cursor-not-allowed" : ""}`}>
            {loading
              ? <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="size-3 animate-spin" />Loading…</span>
              : <SelectValue placeholder="Select a property" />}
          </SelectTrigger>
          <SelectContent className="p-1 rounded-md">
            {properties.map((p) => (
              <SelectItem key={p.slug} value={p.slug} className="text-xs cursor-pointer rounded-sm">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value && !locked && (
          <Button variant="outline" size="icon" className="size-8 shrink-0 cursor-pointer text-muted-foreground" onClick={() => onChange("")} type="button">
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </Field>
  );
}

// ─── Step 1 — Single ──────────────────────────────────────────────────────────

function SingleStep1({
  data, onChange, errors, properties, propertiesLoading, propertyLocked,
}: {
  data: Step1Data; onChange: (d: Step1Data) => void; errors: FieldErrors<Step1Data>;
  properties: PropertyOption[]; propertiesLoading: boolean; propertyLocked: boolean;
}) {
  const selectedProperty = properties.find((p) => p.slug === data.propertySlug);

  function handleUnitTypeChange(name: string) {
    const matched = selectedProperty?.unitTypes.find((u) => u.name === name);
    onChange({
      ...data,
      unitType:      name,
      unitTypeId:    matched?._id ?? "",
      rentAmount:    matched ? String(matched.rentAmount)    : data.rentAmount,
      depositAmount: matched ? String(matched.depositAmount) : data.depositAmount,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Unit Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Configure the basic details for this unit.</p>
      </div>

      <PropertySelect
        value={data.propertySlug}
        onChange={(v) => onChange({ ...data, propertySlug: v, unitType: "", unitTypeId: "", rentAmount: "", depositAmount: "" })}
        properties={properties} loading={propertiesLoading} locked={propertyLocked}
        error={errors.propertySlug}
      />

      <Field label="Unit Number" required error={errors.unitNumber}>
        <Input
          className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.unitNumber ? "border-red-400" : ""}`}
          placeholder="e.g. A1, 3B, 12"
          value={data.unitNumber}
          onChange={(e) => onChange({ ...data, unitNumber: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit Type" required error={errors.unitType}>
          <Select value={data.unitType} onValueChange={handleUnitTypeChange} disabled={!data.propertySlug}>
            <SelectTrigger className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 disabled:opacity-50 ${errors.unitType ? "border-red-400" : ""}`}>
              <SelectValue placeholder={data.propertySlug ? "Select unit type" : "Select a property first"} />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {(selectedProperty?.unitTypes ?? []).map((t) => (
                <SelectItem key={t.name} value={t.name} className="text-xs cursor-pointer rounded-sm">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status" required error={errors.status}>
          <Select value={data.status} onValueChange={(v) => onChange({ ...data, status: v as Step1Data["status"] })}>
            <SelectTrigger className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.status ? "border-red-400" : ""}`}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              <SelectItem value="vacant"   className="text-xs cursor-pointer rounded-sm">Vacant</SelectItem>
              <SelectItem value="occupied" className="text-xs cursor-pointer rounded-sm">Occupied</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Rent Amount (KES)" required error={errors.rentAmount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">KES</span>
            <Input
              className={`h-8 text-xs pl-10 border-border rounded-md focus-visible:ring-0 ${errors.rentAmount ? "border-red-400" : ""}`}
              placeholder="e.g. 25,000"
              value={data.rentAmount}
              onChange={(e) => onChange({ ...data, rentAmount: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </div>
        </Field>
        <Field label="Deposit Amount (KES)" required error={errors.depositAmount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">KES</span>
            <Input
              className={`h-8 text-xs pl-10 border-border rounded-md focus-visible:ring-0 ${errors.depositAmount ? "border-red-400" : ""}`}
              placeholder="e.g. 25,000"
              value={data.depositAmount}
              onChange={(e) => onChange({ ...data, depositAmount: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

// ─── Step 1 — Batch ───────────────────────────────────────────────────────────

function BatchStep1({
  data, onChange, errors, properties, propertiesLoading, propertyLocked,
}: {
  data: BatchStep1Data; onChange: (d: BatchStep1Data) => void;
  errors: FieldErrors<BatchStep1Data>; properties: PropertyOption[];
  propertiesLoading: boolean; propertyLocked: boolean;
}) {
  const selectedProperty = properties.find((p) => p.slug === data.propertySlug);
  const preview          = parseBatchUnitNumbers(data);
  const overLimit        = preview.length > MAX_BATCH;

  function handleUnitTypeChange(name: string) {
    const matched = selectedProperty?.unitTypes.find((u) => u.name === name);
    onChange({
      ...data,
      unitType:      name,
      unitTypeId:    matched?._id ?? "",
      rentAmount:    matched ? String(matched.rentAmount)    : data.rentAmount,
      depositAmount: matched ? String(matched.depositAmount) : data.depositAmount,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Batch Configuration</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Create multiple units at once with the same type and rent.
        </p>
      </div>

      <PropertySelect
        value={data.propertySlug}
        onChange={(v) => onChange({ ...data, propertySlug: v, unitType: "", unitTypeId: "", rentAmount: "", depositAmount: "" })}
        properties={properties} loading={propertiesLoading} locked={propertyLocked}
        error={errors.propertySlug}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit Type" required error={errors.unitType}>
          <Select value={data.unitType} onValueChange={handleUnitTypeChange} disabled={!data.propertySlug}>
            <SelectTrigger className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 disabled:opacity-50 ${errors.unitType ? "border-red-400" : ""}`}>
              <SelectValue placeholder={data.propertySlug ? "Select unit type" : "Select a property first"} />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {(selectedProperty?.unitTypes ?? []).map((t) => (
                <SelectItem key={t.name} value={t.name} className="text-xs cursor-pointer rounded-sm">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status" required error={errors.status}>
          <Select value={data.status} onValueChange={(v) => onChange({ ...data, status: v as BatchStep1Data["status"] })}>
            <SelectTrigger className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.status ? "border-red-400" : ""}`}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              <SelectItem value="vacant"   className="text-xs cursor-pointer rounded-sm">Vacant</SelectItem>
              <SelectItem value="occupied" className="text-xs cursor-pointer rounded-sm">Occupied</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Rent Amount (KES)" required error={errors.rentAmount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">KES</span>
            <Input className={`h-8 text-xs pl-10 border-border rounded-md focus-visible:ring-0 ${errors.rentAmount ? "border-red-400" : ""}`}
              placeholder="e.g. 25,000" value={data.rentAmount}
              onChange={(e) => onChange({ ...data, rentAmount: e.target.value.replace(/[^0-9]/g, "") })} />
          </div>
        </Field>
        <Field label="Deposit Amount (KES)" required error={errors.depositAmount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">KES</span>
            <Input className={`h-8 text-xs pl-10 border-border rounded-md focus-visible:ring-0 ${errors.depositAmount ? "border-red-400" : ""}`}
              placeholder="e.g. 25,000" value={data.depositAmount}
              onChange={(e) => onChange({ ...data, depositAmount: e.target.value.replace(/[^0-9]/g, "") })} />
          </div>
        </Field>
      </div>

      {/* Unit number generation */}
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Unit Numbers</p>

        {/* Method toggle */}
        <div className="flex rounded-md border border-border overflow-hidden w-fit">
          {(["range", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...data, method: m })}
              className={`text-xs px-3 py-1.5 transition-colors cursor-pointer ${
                data.method === m
                  ? "bg-[#2D64C8] text-white"
                  : "bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {m === "range" ? "Prefix + Range" : "Manual List"}
            </button>
          ))}
        </div>

        {data.method === "range" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1 w-24">
                <label className="text-[11px] text-muted-foreground font-medium">Prefix</label>
                <Input
                  className="h-8 text-xs border-border rounded-md focus-visible:ring-0"
                  placeholder="e.g. A"
                  value={data.prefix}
                  onChange={(e) => onChange({ ...data, prefix: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <label className="text-[11px] text-muted-foreground font-medium">From</label>
                <Input
                  type="number" min={1}
                  className="h-8 text-xs border-border rounded-md focus-visible:ring-0"
                  placeholder="1"
                  value={data.rangeFrom}
                  onChange={(e) => onChange({ ...data, rangeFrom: e.target.value })}
                />
              </div>
              <span className="text-xs text-muted-foreground mb-2">to</span>
              <div className="flex flex-col gap-1 w-20">
                <label className="text-[11px] text-muted-foreground font-medium">To</label>
                <Input
                  type="number" min={1}
                  className="h-8 text-xs border-border rounded-md focus-visible:ring-0"
                  placeholder="10"
                  value={data.rangeTo}
                  onChange={(e) => onChange({ ...data, rangeTo: e.target.value })}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Generates: A1, A2, A3 … (prefix + number)
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <textarea
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-0 resize-none min-h-[72px] placeholder:text-muted-foreground"
              placeholder={"101, 102, 103\n201, 202, 203"}
              value={data.manualInput}
              onChange={(e) => onChange({ ...data, manualInput: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">Separate with commas or new lines.</p>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">
                Preview
                <span className={`ml-1.5 font-semibold ${overLimit ? "text-red-500" : "text-foreground"}`}>
                  ({preview.length} unit{preview.length !== 1 ? "s" : ""}{overLimit ? ` — max ${MAX_BATCH}` : ""})
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {preview.slice(0, MAX_BATCH + 5).map((n) => (
                <span
                  key={n}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    overLimit ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-border text-foreground"
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
            {errors.manualInput && <p className="text-xs text-red-500">{errors.manualInput}</p>}
          </div>
        )}

        {errors.rangeFrom && <p className="text-xs text-red-500">{errors.rangeFrom}</p>}
      </div>
    </div>
  );
}

// ─── Step 2 — Lease Terms (shared) ───────────────────────────────────────────

function Step2({
  data, onChange, errors, propertySlug, unitTypeId, unitTypeName, agreementFilename, onTermsExtracted,
}: {
  data: Step2Data; onChange: (d: Step2Data) => void; errors: FieldErrors<Step2Data>;
  propertySlug: string; unitTypeId: string; unitTypeName: string;
  agreementFilename?: string; onTermsExtracted: (terms: AgreementTerms, filename: string) => void;
}) {
  const fileRef             = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleAgreementUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".docx")) { toast.error("Only .docx files are supported."); return; }
    if (file.size > 10 * 1024 * 1024)               { toast.error("File must be under 10 MB.");       return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("agreement", file);
      const res  = await fetch(`/api/properties/${propertySlug}/unit-types/${unitTypeId}/agreement`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Upload failed");
      onTermsExtracted(json.data.agreementTerms ?? {}, json.data.agreementFilename);
      if (json.data.extractionError) toast.error(`Uploaded but extraction failed: ${json.data.extractionError}`);
      else toast.success("Agreement uploaded and lease terms extracted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const isExtracted = data.termsSource === "extracted";
  const hasTerms    = data.termsSource !== "none";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Lease Terms</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Standard terms applied when creating a lease for this unit.</p>
      </div>

      {isExtracted ? (
        <div className="rounded-lg border border-[#2D64C8]/20 bg-[#2D64C8]/5 px-3 py-2.5 flex items-start gap-2">
          <Sparkles className="size-3.5 text-[#2D64C8] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-[#2D64C8]">Pre-filled from tenancy agreement</p>
            <p className="text-[11px] text-muted-foreground">
              Extracted from <span className="font-medium">{agreementFilename}</span>. Review and adjust as needed.
            </p>
          </div>
        </div>
      ) : !hasTerms ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 flex flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-amber-800">No tenancy agreement for {unitTypeName || "this unit type"}</p>
              <p className="text-[11px] text-amber-700">Upload the agreement to auto-fill, or enter terms manually below.</p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 transition-colors w-fit disabled:opacity-50"
            disabled={uploading || !unitTypeId}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <><Loader2 className="size-3 animate-spin" />Uploading &amp; extracting…</> : <><Upload className="size-3" />Upload agreement (.docx)</>}
          </button>
          <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAgreementUpload(f); e.target.value = ""; }} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-center gap-2">
          <Info className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">Entered manually. All fields are editable.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Lease Duration (months)" required error={errors.leaseDurationMonths} hint="e.g. 12 for a 1-year lease">
          <Input type="number" min={1}
            className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 ${errors.leaseDurationMonths ? "border-red-400" : ""}`}
            placeholder="e.g. 12" value={data.leaseDurationMonths}
            onChange={(e) => onChange({ ...data, leaseDurationMonths: e.target.value, termsSource: "manual" })} />
        </Field>
        <Field label="Notice Period (days)" required error={errors.noticePeriodDays} hint="Days required to vacate">
          <Input type="number" min={1}
            className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 ${errors.noticePeriodDays ? "border-red-400" : ""}`}
            placeholder="e.g. 30" value={data.noticePeriodDays}
            onChange={(e) => onChange({ ...data, noticePeriodDays: e.target.value, termsSource: "manual" })} />
        </Field>
      </div>

      <Field label="Payment Due Day" error={errors.paymentDay}>
        <div className="flex items-center h-8 px-3 rounded-md border border-border bg-muted/40 text-xs text-foreground">
          {data.paymentDay ? `${ordinal(data.paymentDay)} of each month` : "—"}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Set on the property. Invoices are generated and tenants notified on this day.</p>
      </Field>

      {data.keyRules.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Key Rules from Agreement</p>
          <ul className="flex flex-col gap-1.5">
            {data.keyRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="size-4 rounded-full bg-[#2D64C8]/10 text-[#2D64C8] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Step 3 — Images (single only) ───────────────────────────────────────────

function Step3({ data, onChange }: { data: Step3Data; onChange: (d: Step3Data) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: UnitImage[] = Array.from(files).filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), description: "" }));
    onChange({ images: [...data.images, ...newImages] });
  };
  const removeImage = (id: string) => {
    const img = data.images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.preview);
    onChange({ images: data.images.filter((i) => i.id !== id) });
  };
  const updateDescription = (id: string, description: string) =>
    onChange({ images: data.images.map((i) => (i.id === id ? { ...i, description } : i)) });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Unit Images</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Upload photos of this unit. Optional.</p>
      </div>
      <button type="button" onClick={() => inputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors h-32 flex flex-col items-center justify-center gap-2 cursor-pointer w-full">
        <ImagePlus className="size-5 text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">Click to upload images</p>
        <p className="text-[11px] text-muted-foreground/60">JPG, PNG, WEBP up to 10MB each</p>
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {data.images.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.images.map((img, index) => (
            <div key={img.id} className="rounded-lg border bg-white p-3 flex items-start gap-3">
              <div className="relative shrink-0 size-16 rounded-md overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`Unit image ${index + 1}`} className="object-cover w-full h-full" />
              </div>
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <Label className="text-xs font-medium">Image {index + 1} Description</Label>
                <Input className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
                  placeholder="e.g. Living room, Kitchen" value={img.description}
                  onChange={(e) => updateDescription(img.id, e.target.value)} />
                <p className="text-[11px] text-muted-foreground truncate">{img.file.name}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => removeImage(img.id)}>
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {data.images.length > 0 && (
        <Button variant="outline" className="gap-1.5 text-xs h-8 w-full border-dashed hover:bg-white cursor-pointer" onClick={() => inputRef.current?.click()}>
          <Plus className="size-3.5" /> Add More Images
        </Button>
      )}
    </div>
  );
}

// ─── Batch result screen ──────────────────────────────────────────────────────

function BatchResultScreen({
  result, propertySlug, onCreateMore, onGoToProperty,
}: {
  result: BatchResult; propertySlug: string;
  onCreateMore: () => void; onGoToProperty: () => void;
}) {
  void propertySlug;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 py-4">
        <CheckCircle2 className="size-10 text-green-500" />
        <h2 className="text-sm font-semibold text-foreground">Batch complete</h2>
        <p className="text-xs text-muted-foreground text-center">
          {result.created.length} of {result.total} unit{result.total !== 1 ? "s" : ""} created successfully.
        </p>
      </div>

      {result.created.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-green-500" /> Created ({result.created.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.created.map((n) => (
              <span key={n} className="text-[11px] font-mono px-2 py-0.5 rounded border bg-green-50 border-green-200 text-green-700">{n}</span>
            ))}
          </div>
        </div>
      )}

      {result.skipped.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <XCircle className="size-3 text-amber-500" /> Already existed — skipped ({result.skipped.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.skipped.map((n) => (
              <span key={n} className="text-[11px] font-mono px-2 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-700">{n}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 h-8 text-xs cursor-pointer" onClick={onCreateMore}>
          <Layers className="size-3.5 mr-1" /> Create More
        </Button>
        <Button className="flex-1 h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer" onClick={onGoToProperty}>
          <Check className="size-3.5 mr-1" /> Go to Property
        </Button>
      </div>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateSingleStep1(data: Step1Data): FieldErrors<Step1Data> {
  const e: FieldErrors<Step1Data> = {};
  if (!data.propertySlug)         e.propertySlug  = "Please select a property.";
  if (!data.unitNumber.trim())    e.unitNumber    = "Unit number is required.";
  if (!data.unitType)             e.unitType      = "Please select a unit type.";
  if (!data.status)               e.status        = "Please select a status.";
  if (!data.rentAmount.trim())    e.rentAmount    = "Rent amount is required.";
  if (!data.depositAmount.trim()) e.depositAmount = "Deposit amount is required.";
  return e;
}

function validateBatchStep1(data: BatchStep1Data): FieldErrors<BatchStep1Data> {
  const e: FieldErrors<BatchStep1Data> = {};
  if (!data.propertySlug)         e.propertySlug  = "Please select a property.";
  if (!data.unitType)             e.unitType      = "Please select a unit type.";
  if (!data.status)               e.status        = "Please select a status.";
  if (!data.rentAmount.trim())    e.rentAmount    = "Rent amount is required.";
  if (!data.depositAmount.trim()) e.depositAmount = "Deposit amount is required.";
  const preview = parseBatchUnitNumbers(data);
  if (preview.length === 0)  e.rangeFrom    = "Enter at least one unit number.";
  if (preview.length > MAX_BATCH) e.rangeFrom = `Maximum ${MAX_BATCH} units per batch.`;
  return e;
}

function validateStep2(data: Step2Data): FieldErrors<Step2Data> {
  const e: FieldErrors<Step2Data> = {};
  const months = parseInt(data.leaseDurationMonths);
  const notice = parseInt(data.noticePeriodDays);
  if (!data.leaseDurationMonths || isNaN(months) || months < 1)
    e.leaseDurationMonths = "Lease duration is required (min 1 month).";
  if (!data.noticePeriodDays || isNaN(notice) || notice < 1)
    e.noticePeriodDays = "Notice period is required (min 1 day).";
  return e;
}

// ─── Main page ────────────────────────────────────────────────────────────────

function NewUnitPageInner() {
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const propertyLocked = !!searchParams.get("propertyId");
  const initialSlug    = searchParams.get("propertyId") ?? "";

  // ─── Mode ───────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"single" | "batch">("single");

  // ─── Shared state ───────────────────────────────────────────────────────────
  const [step,            setStep]            = useState(1);
  const [submitting,      setSubmitting]      = useState(false);
  const [properties,      setProperties]      = useState<PropertyOption[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [batchResult,     setBatchResult]     = useState<BatchResult | null>(null);

  // ─── Step state ─────────────────────────────────────────────────────────────
  const [step1, setStep1] = useState<Step1Data>({
    propertySlug: initialSlug, unitNumber: "", unitType: "", unitTypeId: "", status: "", rentAmount: "", depositAmount: "",
  });
  const [batchStep1, setBatchStep1] = useState<BatchStep1Data>({
    propertySlug: initialSlug, unitType: "", unitTypeId: "", status: "", rentAmount: "", depositAmount: "",
    method: "range", prefix: "", rangeFrom: "1", rangeTo: "10", manualInput: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    leaseDurationMonths: "", noticePeriodDays: "", paymentDay: "", keyRules: [], termsSource: "none",
  });
  const [step3, setStep3] = useState<Step3Data>({ images: [] });

  const [errors1,  setErrors1]  = useState<FieldErrors<Step1Data>>({});
  const [errorsB1, setErrorsB1] = useState<FieldErrors<BatchStep1Data>>({});
  const [errors2,  setErrors2]  = useState<FieldErrors<Step2Data>>({});

  // ─── Fetch properties ────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res  = await fetch("/api/properties");
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Failed to load properties");
        const opts: PropertyOption[] = (json as {
          slug: string; propertyName: string;
          billing: { rentDueDay: number };
          unitTypes: { _id: string; name: string; rentAmount: number; depositAmount?: number; agreementFilename?: string; agreementTerms?: AgreementTerms }[];
        }[]).map((p) => ({
          slug:       p.slug,
          name:       p.propertyName,
          rentDueDay: p.billing?.rentDueDay ?? 1,
          unitTypes:  p.unitTypes.map((u) => ({
            _id:               u._id,
            name:              u.name,
            rentAmount:        u.rentAmount,
            depositAmount:     u.depositAmount ?? 0,
            agreementFilename: u.agreementFilename,
            agreementTerms:    u.agreementTerms,
          })),
        }));
        setProperties(opts);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load properties");
      } finally {
        setPropertiesLoading(false);
      }
    }
    fetchProperties();
  }, []);

  // ─── Auto-populate Step 2 ────────────────────────────────────────────────────

  const activeSlug   = mode === "single" ? step1.propertySlug   : batchStep1.propertySlug;
  const activeTypeId = mode === "single" ? step1.unitTypeId      : batchStep1.unitTypeId;

  useEffect(() => {
    const prop       = properties.find((p) => p.slug === activeSlug);
    const paymentDay = prop ? String(prop.rentDueDay) : "";
    if (!activeTypeId) { setStep2((prev) => ({ ...prev, paymentDay })); return; }
    const ut = prop?.unitTypes.find((u) => u._id === activeTypeId);
    if (!ut) return;
    const terms      = ut.agreementTerms;
    const hasAnyTerm = terms && (terms.leaseDurationMonths != null || terms.noticePeriodDays != null || terms.keyRules?.length);
    setStep2((prev) => ({
      ...prev,
      paymentDay,
      ...(hasAnyTerm ? termsToStep2(terms!, "extracted") : { termsSource: "none" }),
    }));
  }, [activeTypeId, activeSlug, properties]);

  // ─── Mode switch ─────────────────────────────────────────────────────────────

  function switchMode(m: "single" | "batch") {
    setMode(m);
    setStep(1);
    setBatchResult(null);
    setErrors1({}); setErrorsB1({}); setErrors2({});
    // Carry over the property slug when switching
    if (m === "batch") setBatchStep1((prev) => ({ ...prev, propertySlug: step1.propertySlug }));
    else               setStep1((prev) => ({ ...prev, propertySlug: batchStep1.propertySlug }));
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const steps = mode === "single" ? SINGLE_STEPS : BATCH_STEPS;

  function handleNext() {
    if (step === 1) {
      if (mode === "single") {
        const errs = validateSingleStep1(step1);
        if (Object.keys(errs).length) { setErrors1(errs); return; }
        setErrors1({});
      } else {
        const errs = validateBatchStep1(batchStep1);
        if (Object.keys(errs).length) { setErrorsB1(errs); return; }
        setErrorsB1({});
      }
      setStep(2);
    } else if (step === 2 && mode === "single") {
      const errs = validateStep2(step2);
      if (Object.keys(errs).length) { setErrors2(errs); return; }
      setErrors2({});
      setStep(3);
    }
  }

  function handlePrev() { setStep((s) => Math.max(1, s - 1)); }

  // ─── Submit — single ─────────────────────────────────────────────────────────

  async function submitSingle(andCreateAnother: boolean) {
    setSubmitting(true);
    try {
      const res  = await fetch("/api/units", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId:      step1.propertySlug,
          unitNumber:      step1.unitNumber,
          rentAmount:      Number(step1.rentAmount),
          depositAmount:   Number(step1.depositAmount),
          occupancyStatus: step1.status === "occupied" ? "OCCUPIED" : "VACANT",
          leaseTerms: {
            leaseDurationMonths: step2.leaseDurationMonths ? Number(step2.leaseDurationMonths) : undefined,
            noticePeriodDays:    step2.noticePeriodDays    ? Number(step2.noticePeriodDays)    : undefined,
            paymentDay:          step2.paymentDay          ? Number(step2.paymentDay)          : undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? "Failed to create unit"); return; }

      toast.success(`Unit ${step1.unitNumber} created!`);
      if (andCreateAnother) {
        // Reset unit number only, keep everything else
        setStep1((prev) => ({ ...prev, unitNumber: "" }));
        setStep(1);
      } else {
        router.push(`/properties/${step1.propertySlug}`);
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Submit — batch ──────────────────────────────────────────────────────────

  async function submitBatch() {
    const errs = validateStep2(step2);
    if (Object.keys(errs).length) { setErrors2(errs); return; }

    setSubmitting(true);
    try {
      const unitNumbers = parseBatchUnitNumbers(batchStep1);
      const res  = await fetch("/api/units/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId:      batchStep1.propertySlug,
          unitNumbers,
          rentAmount:      Number(batchStep1.rentAmount),
          depositAmount:   Number(batchStep1.depositAmount),
          occupancyStatus: batchStep1.status === "occupied" ? "OCCUPIED" : "VACANT",
          leaseTerms: {
            leaseDurationMonths: step2.leaseDurationMonths ? Number(step2.leaseDurationMonths) : undefined,
            noticePeriodDays:    step2.noticePeriodDays    ? Number(step2.noticePeriodDays)    : undefined,
            paymentDay:          step2.paymentDay          ? Number(step2.paymentDay)          : undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? "Batch creation failed"); return; }
      setBatchResult(json.data);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Terms extracted callback ────────────────────────────────────────────────

  function handleTermsExtracted(terms: AgreementTerms) {
    setStep2((prev) => ({ ...prev, ...termsToStep2(terms, "extracted") }));
    setProperties((prev) =>
      prev.map((p) => p.slug !== activeSlug ? p : {
        ...p,
        unitTypes: p.unitTypes.map((u) => u._id !== activeTypeId ? u : { ...u, agreementTerms: terms }),
      }),
    );
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const selectedProperty  = properties.find((p) => p.slug === activeSlug);
  const selectedUnitType  = selectedProperty?.unitTypes.find((u) => u._id === activeTypeId);
  const agreementFilename = selectedUnitType?.agreementFilename;
  const activeUnitType    = mode === "single" ? step1.unitType : batchStep1.unitType;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4 w-full">

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden bg-white w-fit">
          <button
            type="button"
            onClick={() => switchMode("single")}
            className={`flex items-center gap-1.5 text-xs px-4 py-2 transition-colors cursor-pointer ${
              mode === "single" ? "bg-[#2D64C8] text-white" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Square className="size-3" /> Single Unit
          </button>
          <button
            type="button"
            onClick={() => switchMode("batch")}
            className={`flex items-center gap-1.5 text-xs px-4 py-2 transition-colors cursor-pointer ${
              mode === "batch" ? "bg-[#2D64C8] text-white" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Layers className="size-3" /> Batch Create
          </button>
        </div>

        <StepIndicator current={step} steps={steps} />

        <div className="rounded-lg border bg-white p-4 flex flex-col gap-4">

          {/* Batch result screen */}
          {batchResult ? (
            <BatchResultScreen
              result={batchResult}
              propertySlug={batchStep1.propertySlug}
              onCreateMore={() => { setBatchResult(null); setStep(1); }}
              onGoToProperty={() => router.push(`/properties/${batchStep1.propertySlug}`)}
            />
          ) : (
            <>
              {/* Step content */}
              {step === 1 && mode === "single" && (
                <SingleStep1
                  data={step1} onChange={setStep1} errors={errors1}
                  properties={properties} propertiesLoading={propertiesLoading} propertyLocked={propertyLocked}
                />
              )}
              {step === 1 && mode === "batch" && (
                <BatchStep1
                  data={batchStep1} onChange={setBatchStep1} errors={errorsB1}
                  properties={properties} propertiesLoading={propertiesLoading} propertyLocked={propertyLocked}
                />
              )}
              {step === 2 && (
                <Step2
                  data={step2} onChange={setStep2} errors={errors2}
                  propertySlug={activeSlug} unitTypeId={activeTypeId}
                  unitTypeName={activeUnitType} agreementFilename={agreementFilename}
                  onTermsExtracted={handleTermsExtracted}
                />
              )}
              {step === 3 && mode === "single" && (
                <Step3 data={step3} onChange={setStep3} />
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline" className="gap-1.5 text-xs h-8 px-3 cursor-pointer w-36"
                  onClick={handlePrev} disabled={step === 1}
                >
                  <ArrowLeft className="size-3.5" /> Previous
                </Button>

                <div className="flex items-center gap-2">
                  {/* Single: final step */}
                  {mode === "single" && step === SINGLE_STEPS.length && (
                    <>
                      <Button
                        variant="outline" className="text-xs h-8 px-3 cursor-pointer gap-1.5"
                        onClick={() => submitSingle(true)} disabled={submitting}
                      >
                        {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                        Save &amp; Add Another
                      </Button>
                      <Button
                        className="gap-1.5 text-xs font-semibold h-8 px-3 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer"
                        onClick={() => submitSingle(false)} disabled={submitting}
                      >
                        {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        Create Unit
                      </Button>
                    </>
                  )}

                  {/* Batch: final step */}
                  {mode === "batch" && step === BATCH_STEPS.length && (
                    <Button
                      className="gap-1.5 text-xs font-semibold h-8 px-4 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer"
                      onClick={submitBatch} disabled={submitting}
                    >
                      {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Layers className="size-3.5" />}
                      {submitting ? "Creating…" : `Create ${parseBatchUnitNumbers(batchStep1).length} Units`}
                    </Button>
                  )}

                  {/* Not final step */}
                  {step < steps.length && (
                    <Button
                      className="gap-1.5 text-xs font-semibold h-8 px-3 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer w-36"
                      onClick={handleNext}
                    >
                      Next <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewUnitPage() {
  return <Suspense><NewUnitPageInner /></Suspense>;
}
