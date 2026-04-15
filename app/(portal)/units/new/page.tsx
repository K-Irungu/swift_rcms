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
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Property = { id: string; name: string; types: string[] };

type Step1Data = {
  propertyId: string;
  unitNumber: string;
  unitType: string;
  status: "vacant" | "occupied" | "";
  price: string;
};

type Step2Data = { amenities: string[] };

type BillingItem = { id: string; name: string; amount: string };
type Step3Data = { items: BillingItem[] };

type Step4Data = {
  leasePeriodUnit: "monthly" | "yearly" | "";
  leasePeriod: string;
  paymentDay: string;
};

type UnitImage = { id: string; file: File; preview: string; description: string };
type Step5Data = { images: UnitImage[] };

type FieldErrors<T> = Partial<Record<keyof T, string>>;

// ─── Mock data ────────────────────────────────────────────────────────────────

const PROPERTIES: Property[] = [
  { id: "1", name: "Test 1", types: ["1 Bedroom", "2 Bedroom"] },
  { id: "2", name: "Genesis House", types: ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"] },
  { id: "3", name: "Ridgeways Apartments", types: ["1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse"] },
  { id: "7", name: "New Test By Dev", types: ["Bedsitter", "1 Bedroom"] },
  { id: "9", name: "Test 001", types: ["Studio", "1 Bedroom", "2 Bedroom"] },
];

const AMENITIES = [
  "Parking", "WiFi / Internet", "24hr Security", "CCTV", "Backup Generator",
  "Water Tank", "Borehole", "Swimming Pool", "Gym", "Elevator / Lift",
  "Balcony", "Garden / Compound", "Furnished", "Air Conditioning",
  "Solar Power", "Intercom", "Laundry Room", "Servant's Quarter",
  "DSTV / Cable TV", "Gas Cooker", "Borehole Water", "Wheelchair Access",
];

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => `${i + 1}`);

const UNIT_STEPS = [
  { number: 1, label: "Details" },
  { number: 2, label: "Amenities" },
  { number: 3, label: "Billing" },
  { number: 4, label: "Lease Terms" },
  { number: 5, label: "Images" },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────

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

// ─── Step 1: Details ──────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  errors,
}: {
  data: Step1Data;
  onChange: (d: Step1Data) => void;
  errors: FieldErrors<Step1Data>;
}) {
  const selectedProperty = PROPERTIES.find((p) => p.id === data.propertyId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Unit Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select the property and configure the basic details for this unit.
        </p>
      </div>

      {/* Property */}
      <Field label="Property" required error={errors.propertyId}>
        <div className="flex items-center gap-1.5">
          <Select
            value={data.propertyId}
            onValueChange={(v) =>
              onChange({ ...data, propertyId: v, unitType: "" })
            }
          >
            <SelectTrigger
              className={`flex-1 h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.propertyId ? "border-red-400" : ""}`}
            >
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {PROPERTIES.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="text-xs cursor-pointer rounded-sm"
                >
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.propertyId && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...data, propertyId: "", unitType: "" })}
              type="button"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </Field>

      {/* Unit Number */}
      <Field label="Unit Number" required error={errors.unitNumber}>
        <Input
          className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.unitNumber ? "border-red-400" : ""}`}
          placeholder="e.g. A1, 3B, 12"
          value={data.unitNumber}
          onChange={(e) => onChange({ ...data, unitNumber: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Unit Type */}
        <Field label="Unit Type" required error={errors.unitType}>
          <Select
            value={data.unitType}
            onValueChange={(v) => onChange({ ...data, unitType: v })}
            disabled={!data.propertyId}
          >
            <SelectTrigger
              className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 disabled:opacity-50 ${errors.unitType ? "border-red-400" : ""}`}
            >
              <SelectValue
                placeholder={
                  data.propertyId ? "Select unit type" : "Select a property first"
                }
              />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {(selectedProperty?.types ?? []).map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  className="text-xs cursor-pointer rounded-sm"
                >
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Status */}
        <Field label="Status" required error={errors.status}>
          <Select
            value={data.status}
            onValueChange={(v) =>
              onChange({ ...data, status: v as Step1Data["status"] })
            }
          >
            <SelectTrigger
              className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.status ? "border-red-400" : ""}`}
            >
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              <SelectItem
                value="vacant"
                className="text-xs cursor-pointer rounded-sm"
              >
                Vacant
              </SelectItem>
              <SelectItem
                value="occupied"
                className="text-xs cursor-pointer rounded-sm"
              >
                Occupied
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Price */}
      <Field label="Rent Amount (KES)" required error={errors.price}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
            KES
          </span>
          <Input
            className={`h-8 text-xs pl-10 border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.price ? "border-red-400" : ""}`}
            placeholder="e.g. 25,000"
            value={data.price}
            onChange={(e) =>
              onChange({ ...data, price: e.target.value.replace(/[^0-9]/g, "") })
            }
          />
        </div>
      </Field>
    </div>
  );
}

// ─── Step 2: Amenities ────────────────────────────────────────────────────────

function Step2({
  data,
  onChange,
}: {
  data: Step2Data;
  onChange: (d: Step2Data) => void;
}) {
  const toggle = (amenity: string) => {
    const has = data.amenities.includes(amenity);
    onChange({
      amenities: has
        ? data.amenities.filter((a) => a !== amenity)
        : [...data.amenities, amenity],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Amenities</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select all amenities available in this unit.
        </p>
      </div>

      {data.amenities.length > 0 && (
        <p className="text-xs text-[#2D64C8] font-medium">
          {data.amenities.length}{" "}
          {data.amenities.length === 1 ? "amenity" : "amenities"} selected
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {AMENITIES.map((amenity) => {
          const checked = data.amenities.includes(amenity);
          return (
            <div
              key={amenity}
              role="button"
              tabIndex={0}
              onClick={() => toggle(amenity)}
              onKeyDown={(e) => e.key === "Enter" || e.key === " " ? toggle(amenity) : undefined}
              className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                checked
                  ? "border-[#2D64C8]/40 bg-[#2D64C8]/5"
                  : "border-border bg-white hover:bg-muted/40"
              }`}
            >
              <Checkbox
                checked={checked}
                className="shrink-0 pointer-events-none"
                onCheckedChange={() => {}}
              />
              <span className="text-xs font-medium leading-tight">{amenity}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Billing ──────────────────────────────────────────────────────────

function Step3({
  data,
  onChange,
  billingError,
}: {
  data: Step3Data;
  onChange: (d: Step3Data) => void;
  billingError?: string;
}) {
  const addItem = () => {
    onChange({
      items: [
        ...data.items,
        { id: crypto.randomUUID(), name: "", amount: "" },
      ],
    });
  };

  const updateItem = (id: string, field: keyof BillingItem, value: string) => {
    onChange({
      items: data.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    });
  };

  const removeItem = (id: string) => {
    onChange({ items: data.items.filter((item) => item.id !== id) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Billing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add any recurring charges for this unit. These will be included in
          monthly invoices.
        </p>
      </div>

      {billingError && (
        <p className="text-xs text-red-500">{billingError}</p>
      )}

      <div className="flex flex-col gap-3">
        {data.items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 h-24 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              No billing items added yet.
            </p>
          </div>
        )}

        {data.items.length > 0 && (
          <div className="grid grid-cols-[1fr_140px_36px] gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Charge Name
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Amount (KES)
            </span>
            <span />
          </div>
        )}

        {data.items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_140px_36px] gap-2 items-center"
          >
            <Input
              className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
              placeholder="e.g. Water, Service Charge"
              value={item.name}
              onChange={(e) => updateItem(item.id, "name", e.target.value)}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                KES
              </span>
              <Input
                className="h-8 text-xs pl-10 border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
                placeholder="0"
                value={item.amount}
                onChange={(e) =>
                  updateItem(
                    item.id,
                    "amount",
                    e.target.value.replace(/[^0-9]/g, ""),
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="gap-1.5 text-xs h-8 w-full border-dashed hover:bg-white cursor-pointer"
        onClick={addItem}
      >
        <Plus className="size-3.5" /> Add Billing Item
      </Button>

      {data.items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/40 border px-4 py-2.5">
          <span className="text-xs font-semibold text-foreground">
            Total Monthly Charges
          </span>
          <span className="text-xs font-semibold text-[#2D64C8]">
            KES{" "}
            {data.items
              .reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)
              .toLocaleString("en-KE")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Lease Terms ──────────────────────────────────────────────────────

function Step4({
  data,
  onChange,
  errors,
}: {
  data: Step4Data;
  onChange: (d: Step4Data) => void;
  errors: FieldErrors<Step4Data>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">
          Lease & Billing Terms
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define the lease terms and when rent is due each period.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lease Period Unit */}
        <Field label="Lease Period Unit" required error={errors.leasePeriodUnit}>
          <Select
            value={data.leasePeriodUnit}
            onValueChange={(v) =>
              onChange({
                ...data,
                leasePeriodUnit: v as Step4Data["leasePeriodUnit"],
              })
            }
          >
            <SelectTrigger
              className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.leasePeriodUnit ? "border-red-400" : ""}`}
            >
              <SelectValue placeholder="Select period unit" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              <SelectItem
                value="monthly"
                className="text-xs cursor-pointer rounded-sm"
              >
                Monthly
              </SelectItem>
              <SelectItem
                value="yearly"
                className="text-xs cursor-pointer rounded-sm"
              >
                Yearly
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {/* Lease Period */}
        <Field
          label={
            data.leasePeriodUnit === "yearly"
              ? "Lease Duration (Years)"
              : data.leasePeriodUnit === "monthly"
                ? "Lease Duration (Months)"
                : "Lease Duration"
          }
          required
          error={errors.leasePeriod}
        >
          <Input
            className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.leasePeriod ? "border-red-400" : ""}`}
            placeholder={
              data.leasePeriodUnit === "yearly"
                ? "e.g. 1"
                : data.leasePeriodUnit === "monthly"
                  ? "e.g. 6"
                  : "Select a period unit first"
            }
            disabled={!data.leasePeriodUnit}
            value={data.leasePeriod}
            onChange={(e) =>
              onChange({
                ...data,
                leasePeriod: e.target.value.replace(/[^0-9]/g, ""),
              })
            }
          />
        </Field>
      </div>

      {/* Payment Day */}
      <Field label="Payment Due Day" required error={errors.paymentDay}>
        <Select
          value={data.paymentDay}
          onValueChange={(v) => onChange({ ...data, paymentDay: v })}
        >
          <SelectTrigger
            className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.paymentDay ? "border-red-400" : ""}`}
          >
            <SelectValue placeholder="Select due day of month" />
          </SelectTrigger>
          <SelectContent className="p-1 rounded-md max-h-48">
            {PAYMENT_DAYS.map((d) => (
              <SelectItem
                key={d}
                value={d}
                className="text-xs cursor-pointer rounded-sm"
              >
                {d}
                {d === "1"
                  ? "st"
                  : d === "2"
                    ? "nd"
                    : d === "3"
                      ? "rd"
                      : "th"}{" "}
                of each month
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Invoices will be generated and tenants notified on this day.
        </p>
      </Field>
    </div>
  );
}

// ─── Step 5: Images ───────────────────────────────────────────────────────────

function Step5({
  data,
  onChange,
}: {
  data: Step5Data;
  onChange: (d: Step5Data) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: UnitImage[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        description: "",
      }));
    onChange({ images: [...data.images, ...newImages] });
  };

  const removeImage = (id: string) => {
    const img = data.images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.preview);
    onChange({ images: data.images.filter((i) => i.id !== id) });
  };

  const updateDescription = (id: string, description: string) => {
    onChange({
      images: data.images.map((i) =>
        i.id === id ? { ...i, description } : i,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Unit Images</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload photos of this unit. Add a short description for each image.
          This step is optional.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors h-32 flex flex-col items-center justify-center gap-2 cursor-pointer w-full"
      >
        <ImagePlus className="size-5 text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">Click to upload images</p>
        <p className="text-[11px] text-muted-foreground/60">
          JPG, PNG, WEBP up to 10MB each
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {data.images.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.images.map((img, index) => (
            <div
              key={img.id}
              className="rounded-lg border bg-white p-3 flex items-start gap-3"
            >
              <div className="relative shrink-0 size-16 rounded-md overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`Unit image ${index + 1}`}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <Label className="text-xs font-medium text-foreground">
                  Image {index + 1} Description
                </Label>
                <Input
                  className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
                  placeholder="e.g. Living room, Master bedroom, Kitchen"
                  value={img.description}
                  onChange={(e) => updateDescription(img.id, e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground truncate">
                  {img.file.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer"
                onClick={() => removeImage(img.id)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.images.length > 0 && (
        <Button
          variant="outline"
          className="gap-1.5 text-xs h-8 w-full border-dashed hover:bg-white cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Plus className="size-3.5" /> Add More Images
        </Button>
      )}
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep1(data: Step1Data): FieldErrors<Step1Data> {
  const errors: FieldErrors<Step1Data> = {};
  if (!data.propertyId) errors.propertyId = "Please select a property.";
  if (!data.unitNumber.trim()) errors.unitNumber = "Unit number is required.";
  if (!data.unitType) errors.unitType = "Please select a unit type.";
  if (!data.status) errors.status = "Please select a status.";
  if (!data.price.trim()) errors.price = "Rent amount is required.";
  return errors;
}

function validateStep3(data: Step3Data): string | undefined {
  for (const item of data.items) {
    if (!item.name.trim() || !item.amount.trim()) {
      return "Each billing item must have a name and amount.";
    }
  }
  return undefined;
}

function validateStep4(data: Step4Data): FieldErrors<Step4Data> {
  const errors: FieldErrors<Step4Data> = {};
  if (!data.leasePeriodUnit) errors.leasePeriodUnit = "Please select a period unit.";
  if (!data.leasePeriod.trim()) errors.leasePeriod = "Lease duration is required.";
  if (!data.paymentDay) errors.paymentDay = "Please select a payment due day.";
  return errors;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewUnitPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [step1, setStep1] = useState<Step1Data>({
    propertyId: "",
    unitNumber: "",
    unitType: "",
    status: "",
    price: "",
  });
  const [step2, setStep2] = useState<Step2Data>({ amenities: [] });
  const [step3, setStep3] = useState<Step3Data>({ items: [] });
  const [step4, setStep4] = useState<Step4Data>({
    leasePeriodUnit: "",
    leasePeriod: "",
    paymentDay: "",
  });
  const [step5, setStep5] = useState<Step5Data>({ images: [] });

  const [errors1, setErrors1] = useState<FieldErrors<Step1Data>>({});
  const [errors4, setErrors4] = useState<FieldErrors<Step4Data>>({});
  const [billingError, setBillingError] = useState<string | undefined>();

  const handleNext = () => {
    if (step === 1) {
      const errs = validateStep1(step1);
      if (Object.keys(errs).length) { setErrors1(errs); return; }
      setErrors1({});
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      const err = validateStep3(step3);
      if (err) { setBillingError(err); return; }
      setBillingError(undefined);
      setStep(4);
    } else if (step === 4) {
      const errs = validateStep4(step4);
      if (Object.keys(errs).length) { setErrors4(errs); return; }
      setErrors4({});
      setStep(5);
    }
  };

  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    // TODO: replace with real API call
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Unit created successfully!");
    setSubmitting(false);
    // TODO: router.push(`/portal/units/${newId}`)
  };

  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4 w-full">
        {/* Step indicator */}
        <StepIndicator current={step} steps={UNIT_STEPS} />

        {/* Form card */}
        <div className="rounded-lg border bg-white p-4 flex flex-col gap-4">
          {step === 1 && (
            <Step1 data={step1} onChange={setStep1} errors={errors1} />
          )}
          {step === 2 && (
            <Step2 data={step2} onChange={setStep2} />
          )}
          {step === 3 && (
            <Step3
              data={step3}
              onChange={setStep3}
              billingError={billingError}
            />
          )}
          {step === 4 && (
            <Step4 data={step4} onChange={setStep4} errors={errors4} />
          )}
          {step === 5 && (
            <Step5 data={step5} onChange={setStep5} />
          )}

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

            {step < UNIT_STEPS.length ? (
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
                    <Check className="size-3.5" /> Create Unit
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