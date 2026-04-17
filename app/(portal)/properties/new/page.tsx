"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { StepIndicator } from "@/components/step-indicator";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Loader2,
  MapPin,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step1Data = {
  propertyName: string;
  description: string;
  coverPhoto: File | null;
};

type Step2Data = {
  physicalAddress: string;
  country: string;
  county: string;
  city: string;
  location: string;
};

type UnitType = {
  id: string;
  name: string;
  count: string;
  rentAmount: string;
  depositAmount: string;
};

type Step3Data = {
  unitTypes: UnitType[];
};

type Step4Data = {
  amenities: string[];
};

type Step5Data = {
  rentDueDay: string;
  gracePeriodDays: string;
  lateFeeType: "flat" | "percentage";
  lateFeeValue: string;
  paymentMethods: string[];
};

type FieldErrors<T> = Partial<Record<keyof T, string>>;

// ─── Mock data ────────────────────────────────────────────────────────────────

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia"];

const KENYA_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu",
  "Machakos", "Kajiado", "Murang'a", "Nyeri", "Meru", "Embu", "Kirinyaga",
];

const UNIT_TYPE_PRESETS = [
  "Bedsitter", "Studio", "1 Bedroom", "2 Bedroom",
  "3 Bedroom", "4 Bedroom", "Penthouse", "Shop", "Office",
];

const AMENITY_GROUPS = [
  {
    label: "Water",
    items: ["Piped Water", "Borehole", "Water Tank / Reservoir"],
  },
  {
    label: "Power",
    items: ["Backup Generator", "Solar Power"],
  },
  {
    label: "Security",
    items: ["Security Guard", "CCTV", "Electric Fence", "Controlled Access / Gate"],
  },
  {
    label: "Facilities",
    items: ["Parking", "Covered Parking", "Gym", "Swimming Pool", "Lift / Elevator", "Rooftop Terrace"],
  },
  {
    label: "Connectivity",
    items: ["Fibre Internet"],
  },
  {
    label: "Other",
    items: ["Balcony", "Garden / Compound", "Children's Play Area"],
  },
];

const PAYMENT_METHODS = ["M-Pesa", "Bank Transfer", "Cash", "Airtel Money", "Cheque"];

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { number: 1, label: "Basic Details" },
  { number: 2, label: "Location" },
  { number: 3, label: "Units" },
  { number: 4, label: "Amenities" },
  { number: 5, label: "Billing" },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls = (error?: string) =>
  `h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs${
    error ? " border-red-400" : ""
  }`;

const selectTriggerCls = (error?: string) =>
  `h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0${
    error ? " border-red-400" : ""
  }`;

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Pill({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer select-none ${
        selected
          ? "bg-[#2D64C8] text-white border-[#2D64C8]"
          : "bg-white text-muted-foreground border-border hover:border-[#2D64C8]/50"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Step 1: Basic Details ────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  errors,
}: {
  data: Step1Data;
  onChange: (d: Step1Data) => void;
  errors: FieldErrors<Step1Data>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const coverUrl = data.coverPhoto ? URL.createObjectURL(data.coverPhoto) : null;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    onChange({ ...data, coverPhoto: file });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Basic Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Start with the core details of this property.
        </p>
      </div>

      {/* Cover photo */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-foreground">Cover Photo</Label>
        <div
          className="relative rounded-lg border border-dashed border-border bg-muted/30 h-36 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          {coverUrl ? (
            <>
              <img
                src={coverUrl}
                alt="Cover preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                className="absolute top-2 right-2 size-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ ...data, coverPhoto: null });
                }}
              >
                <X className="size-3" />
              </button>
            </>
          ) : (
            <>
              <Upload className="size-4 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground text-center">
                Drag & drop or{" "}
                <span className="text-[#2D64C8] font-medium">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                PNG, JPG — up to 5 MB
              </p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <Field label="Property Name" required error={errors.propertyName}>
        <Input
          className={inputCls(errors.propertyName)}
          placeholder="e.g. Ridgeways Apartments"
          value={data.propertyName}
          onChange={(e) => onChange({ ...data, propertyName: e.target.value })}
        />
      </Field>

      <Field label="Description">
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-0 resize-none min-h-[80px] placeholder:text-muted-foreground placeholder:text-xs"
          placeholder="Brief description of the property (optional)"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────

function Step2({
  data,
  onChange,
  errors,
}: {
  data: Step2Data;
  onChange: (d: Step2Data) => void;
  errors: FieldErrors<Step2Data>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Location</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Where is this property located?
        </p>
      </div>

      <Field label="Physical Address" required error={errors.physicalAddress}>
        <Input
          className={inputCls(errors.physicalAddress)}
          placeholder="e.g. 14 Ridgeways Close, off Kiambu Road"
          value={data.physicalAddress}
          onChange={(e) => onChange({ ...data, physicalAddress: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Country" required error={errors.country}>
          <Select
            value={data.country}
            onValueChange={(v) => onChange({ ...data, country: v, county: "" })}
          >
            <SelectTrigger className={selectTriggerCls(errors.country)}>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs cursor-pointer rounded-sm">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="County / State" required error={errors.county}>
          {data.country === "Kenya" ? (
            <Select
              value={data.county}
              onValueChange={(v) => onChange({ ...data, county: v })}
            >
              <SelectTrigger className={selectTriggerCls(errors.county)}>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent className="p-1 rounded-md">
                {KENYA_COUNTIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs cursor-pointer rounded-sm">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className={inputCls(errors.county)}
              placeholder="County / State / Province"
              value={data.county}
              onChange={(e) => onChange({ ...data, county: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City / Town" required error={errors.city}>
          <Input
            className={inputCls(errors.city)}
            placeholder="e.g. Nairobi"
            value={data.city}
            onChange={(e) => onChange({ ...data, city: e.target.value })}
          />
        </Field>

        <Field label="Neighbourhood">
          <Input
            className={inputCls()}
            placeholder="e.g. Westlands, Kilimani"
            value={data.location}
            onChange={(e) => onChange({ ...data, location: e.target.value })}
          />
        </Field>
      </div>

      {/* Map placeholder — v2 */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 h-36 flex flex-col items-center justify-center gap-2">
        <MapPin className="size-4 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Interactive map coming in v2</p>
      </div>
    </div>
  );
}

// ─── Step 3: Unit Configuration ───────────────────────────────────────────────

function UnitTypeRow({
  unit,
  onChange,
  onRemove,
  canRemove,
}: {
  unit: UnitType;
  onChange: (u: UnitType) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const isPreset = UNIT_TYPE_PRESETS.includes(unit.name);
  const [custom, setCustom] = useState(!isPreset && unit.name !== "");

  const handleSelectChange = (v: string) => {
    if (v === "__custom__") {
      setCustom(true);
      onChange({ ...unit, name: "" });
    } else {
      setCustom(false);
      onChange({ ...unit, name: v });
    }
  };

  return (
    <div className="rounded-lg border bg-white p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Unit Type</span>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Type name */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Type <span className="text-red-500">*</span>
          </Label>
          {!custom ? (
            <Select
              value={unit.name || ""}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger className="h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0">
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent className="p-1 rounded-md">
                {UNIT_TYPE_PRESETS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs cursor-pointer rounded-sm">
                    {p}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__" className="text-xs cursor-pointer rounded-sm text-[#2D64C8]">
                  Custom…
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs flex-1"
                placeholder="e.g. Garden Cottage"
                value={unit.name}
                onChange={(e) => onChange({ ...unit, name: e.target.value })}
                autoFocus
              />
              <button
                type="button"
                className="text-[11px] text-[#2D64C8] hover:underline whitespace-nowrap"
                onClick={() => { setCustom(false); onChange({ ...unit, name: "" }); }}
              >
                Use preset
              </button>
            </div>
          )}
        </div>

        {/* Count */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            No. of Units <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
            placeholder="e.g. 12"
            value={unit.count}
            onChange={(e) => onChange({ ...unit, count: e.target.value })}
          />
        </div>

        {/* Default rent */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Default Rent (KES) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min={0}
            className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
            placeholder="e.g. 25,000"
            value={unit.rentAmount}
            onChange={(e) => onChange({ ...unit, rentAmount: e.target.value })}
          />
        </div>

        {/* Default deposit */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Default Deposit (KES)
          </Label>
          <Input
            type="number"
            min={0}
            className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
            placeholder="e.g. 50,000 — leave blank if same as rent"
            value={unit.depositAmount}
            onChange={(e) => onChange({ ...unit, depositAmount: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange,
  error,
}: {
  data: Step3Data;
  onChange: (d: Step3Data) => void;
  error?: string;
}) {
  const totalUnits = data.unitTypes.reduce(
    (sum, u) => sum + (parseInt(u.count) || 0),
    0,
  );

  const addUnitType = () => {
    onChange({
      unitTypes: [
        ...data.unitTypes,
        { id: crypto.randomUUID(), name: "", count: "", rentAmount: "", depositAmount: "" },
      ],
    });
  };

  const updateUnitType = (id: string, updated: UnitType) => {
    onChange({ unitTypes: data.unitTypes.map((u) => (u.id === id ? updated : u)) });
  };

  const removeUnitType = (id: string) => {
    onChange({ unitTypes: data.unitTypes.filter((u) => u.id !== id) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Unit Configuration</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define the unit types in this property. Individual units can be fine-tuned after
          the property is created.
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex flex-col gap-3">
        {data.unitTypes.map((unit) => (
          <UnitTypeRow
            key={unit.id}
            unit={unit}
            onChange={(u) => updateUnitType(unit.id, u)}
            onRemove={() => removeUnitType(unit.id)}
            canRemove={data.unitTypes.length > 1}
          />
        ))}
      </div>

      <Button
        variant="outline"
        className="gap-1.5 text-xs h-8 w-full border-dashed hover:bg-white cursor-pointer"
        onClick={addUnitType}
        type="button"
      >
        <Plus className="size-3.5" /> Add Unit Type
      </Button>

      {totalUnits > 0 && (
        <div className="rounded-md bg-muted/40 border border-border px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total units across all types</span>
          <span className="text-xs font-semibold text-foreground">{totalUnits}</span>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Amenities ────────────────────────────────────────────────────────

function Step4({
  data,
  onChange,
}: {
  data: Step4Data;
  onChange: (d: Step4Data) => void;
}) {
  const toggle = (item: string) => {
    const next = data.amenities.includes(item)
      ? data.amenities.filter((a) => a !== item)
      : [...data.amenities, item];
    onChange({ amenities: next });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Amenities & Features</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select what this property offers. You can update these at any time.
        </p>
      </div>

      {AMENITY_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <Pill
                key={item}
                label={item}
                selected={data.amenities.includes(item)}
                onToggle={() => toggle(item)}
              />
            ))}
          </div>
        </div>
      ))}

      {data.amenities.length > 0 && (
        <div className="rounded-md bg-muted/40 border border-border px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Selected</span>
          <span className="text-xs font-semibold text-foreground">
            {data.amenities.length}{" "}
            {data.amenities.length === 1 ? "amenity" : "amenities"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Payment & Billing ────────────────────────────────────────────────

function Step5({
  data,
  onChange,
  errors,
}: {
  data: Step5Data;
  onChange: (d: Step5Data) => void;
  errors: FieldErrors<Step5Data>;
}) {
  const toggleMethod = (method: string) => {
    const next = data.paymentMethods.includes(method)
      ? data.paymentMethods.filter((m) => m !== method)
      : [...data.paymentMethods, method];
    onChange({ ...data, paymentMethods: next });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Payment & Billing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Set the billing rules that apply to all units in this property.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Rent Due Day" required error={errors.rentDueDay}>
          <div className="relative">
            <Input
              type="number"
              min={1}
              max={28}
              className={inputCls(errors.rentDueDay)}
              placeholder="1"
              value={data.rentDueDay}
              onChange={(e) => onChange({ ...data, rentDueDay: e.target.value })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
              of month
            </span>
          </div>
        </Field>

        <Field label="Grace Period" required error={errors.gracePeriodDays}>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={30}
              className={inputCls(errors.gracePeriodDays)}
              placeholder="5"
              value={data.gracePeriodDays}
              onChange={(e) => onChange({ ...data, gracePeriodDays: e.target.value })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
              days
            </span>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Late Fee Type" required error={errors.lateFeeType}>
          <Select
            value={data.lateFeeType}
            onValueChange={(v: "flat" | "percentage") =>
              onChange({ ...data, lateFeeType: v })
            }
          >
            <SelectTrigger className={selectTriggerCls(errors.lateFeeType)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              <SelectItem value="flat" className="text-xs cursor-pointer rounded-sm">
                Flat Amount (KES)
              </SelectItem>
              <SelectItem value="percentage" className="text-xs cursor-pointer rounded-sm">
                Percentage of Rent (%)
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label={data.lateFeeType === "flat" ? "Late Fee Amount (KES)" : "Late Fee (%)"}
          required
          error={errors.lateFeeValue}
        >
          <Input
            type="number"
            min={0}
            className={inputCls(errors.lateFeeValue)}
            placeholder={data.lateFeeType === "flat" ? "e.g. 500" : "e.g. 5"}
            value={data.lateFeeValue}
            onChange={(e) => onChange({ ...data, lateFeeValue: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Accepted Payment Methods" required error={errors.paymentMethods}>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {PAYMENT_METHODS.map((method) => (
            <Pill
              key={method}
              label={method}
              selected={data.paymentMethods.includes(method)}
              onToggle={() => toggleMethod(method)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep1(data: Step1Data): FieldErrors<Step1Data> {
  const errors: FieldErrors<Step1Data> = {};
  if (!data.propertyName.trim()) errors.propertyName = "Property name is required.";
  return errors;
}

function validateStep2(data: Step2Data): FieldErrors<Step2Data> {
  const errors: FieldErrors<Step2Data> = {};
  if (!data.physicalAddress.trim()) errors.physicalAddress = "Physical address is required.";
  if (!data.country) errors.country = "Please select a country.";
  if (!data.county.trim()) errors.county = "County is required.";
  if (!data.city.trim()) errors.city = "City is required.";
  return errors;
}

function validateStep3(data: Step3Data): string | undefined {
  if (data.unitTypes.length === 0) return "Add at least one unit type.";
  for (const u of data.unitTypes) {
    if (!u.name.trim()) return "Each unit type must have a name.";
    if (!u.count || parseInt(u.count) < 1)
      return "Each unit type must have at least 1 unit.";
    if (!u.rentAmount || parseFloat(u.rentAmount) <= 0)
      return "Each unit type must have a default rent amount.";
  }
  return undefined;
}

function validateStep5(data: Step5Data): FieldErrors<Step5Data> {
  const errors: FieldErrors<Step5Data> = {};
  const day = parseInt(data.rentDueDay);
  if (!data.rentDueDay || isNaN(day) || day < 1 || day > 28)
    errors.rentDueDay = "Enter a valid day between 1 and 28.";
  const grace = parseInt(data.gracePeriodDays);
  if (data.gracePeriodDays === "" || isNaN(grace) || grace < 0)
    errors.gracePeriodDays = "Enter a valid grace period (0 or more days).";
  if (!data.lateFeeValue || parseFloat(data.lateFeeValue) < 0)
    errors.lateFeeValue = "Enter a valid late fee amount.";
  if (data.paymentMethods.length === 0)
    errors.paymentMethods = "Select at least one payment method.";
  return errors;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewPropertyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [step1, setStep1] = useState<Step1Data>({
    propertyName: "",
    description: "",
    coverPhoto: null,
  });
  const [step2, setStep2] = useState<Step2Data>({
    physicalAddress: "",
    country: "Kenya",
    county: "",
    city: "",
    location: "",
  });
  const [step3, setStep3] = useState<Step3Data>({
    unitTypes: [
      { id: crypto.randomUUID(), name: "", count: "", rentAmount: "", depositAmount: "" },
    ],
  });
  const [step4, setStep4] = useState<Step4Data>({ amenities: [] });
  const [step5, setStep5] = useState<Step5Data>({
    rentDueDay: "1",
    gracePeriodDays: "5",
    lateFeeType: "flat",
    lateFeeValue: "",
    paymentMethods: [],
  });

  const [errors1, setErrors1] = useState<FieldErrors<Step1Data>>({});
  const [errors2, setErrors2] = useState<FieldErrors<Step2Data>>({});
  const [error3, setError3]   = useState<string | undefined>();
  const [errors5, setErrors5] = useState<FieldErrors<Step5Data>>({});

  const handleNext = () => {
    if (step === 1) {
      const errs = validateStep1(step1);
      if (Object.keys(errs).length) { setErrors1(errs); return; }
      setErrors1({});
      setStep(2);
    } else if (step === 2) {
      const errs = validateStep2(step2);
      if (Object.keys(errs).length) { setErrors2(errs); return; }
      setErrors2({});
      setStep(3);
    } else if (step === 3) {
      const err = validateStep3(step3);
      if (err) { setError3(err); return; }
      setError3(undefined);
      setStep(4);
    } else if (step === 4) {
      // Amenities are optional — move straight through
      setStep(5);
    }
  };

  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    const errs = validateStep5(step5);
    if (Object.keys(errs).length) { setErrors5(errs); return; }
    setErrors5({});
    setSubmitting(true);

    // TODO: replace with real API call
    await new Promise((r) => setTimeout(r, 1500));

    toast.success("Property created successfully!");
    setSubmitting(false);
    // TODO: router.push(`/portal/properties/${newId}`)
  };

  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4 w-full">
        <StepIndicator current={step} steps={WIZARD_STEPS} />

        <div className="rounded-lg border bg-white p-4 flex flex-col gap-4">
          {step === 1 && <Step1 data={step1} onChange={setStep1} errors={errors1} />}
          {step === 2 && <Step2 data={step2} onChange={setStep2} errors={errors2} />}
          {step === 3 && <Step3 data={step3} onChange={setStep3} error={error3} />}
          {step === 4 && <Step4 data={step4} onChange={setStep4} />}
          {step === 5 && <Step5 data={step5} onChange={setStep5} errors={errors5} />}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="gap-1.5 text-xs h-8 px-3 cursor-pointer w-36"
              onClick={handlePrev}
              disabled={step === 1}
            >
              <ArrowLeft className="size-3.5" /> Previous
            </Button>

            {step < WIZARD_STEPS.length ? (
              <Button
                className="gap-1.5 text-xs font-semibold h-8 px-3 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer w-36"
                onClick={handleNext}
              >
                Next <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button
                className="gap-1.5 text-xs font-semibold h-8 px-3 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="size-3.5" /> Create Property
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}