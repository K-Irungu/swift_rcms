"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import Link from "next/link";
import { StepIndicator } from "@/components/step-indicator";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Loader2,
  User,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  X,
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
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type PropertyManager = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type Contact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  whatsapp: string;
  isPrimary: boolean;
};

type Step1Data = {
  managerId: string;
  propertyName: string;
  description: string;
};

type Step2Data = {
  physicalAddress: string;
  country: string;
  county: string;
  city: string;
  location: string;
};

type Step3Data = {
  contacts: Contact[];
};

type FieldErrors<T> = Partial<Record<keyof T, string>>;

// ─── Mock data ────────────────────────────────────────────────────────────────

const PROPERTY_MANAGERS: PropertyManager[] = [
  {
    id: "1",
    name: "John Kamau",
    email: "jkamau@swift.co.ke",
    phone: "+254712345678",
  },
  {
    id: "2",
    name: "Grace Wanjiku",
    email: "gwanjiku@swift.co.ke",
    phone: "+254723456789",
  },
  {
    id: "3",
    name: "Peter Odhiambo",
    email: "podhiambo@swift.co.ke",
    phone: "+254734567890",
  },
  {
    id: "4",
    name: "Alice Njeri",
    email: "anjeri@swift.co.ke",
    phone: "+254745678901",
  },
];

const ROLES = [
  "Property Manager",
  "Caretaker",
  "Security",
  "Maintenance",
  "Agent",
  "Other",
];

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia"];

const KENYA_COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Machakos",
  "Kajiado",
  "Murang'a",
  "Nyeri",
  "Meru",
  "Embu",
  "Kirinyaga",
];

// ─── Wizard steps config ──────────────────────────────────────────────────────

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
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Basic Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Start with the core details of this property.
        </p>
      </div>

      <Field label="Property Manager" required error={errors.managerId}>
        <div className="flex items-center gap-1.5">
          <Select
            value={data.managerId}
            onValueChange={(v) => onChange({ ...data, managerId: v })}
          >
            <SelectTrigger
              className={`flex-1 h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.managerId ? "border-red-400" : ""}`}
            >
              <SelectValue placeholder="Select a property manager" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {PROPERTY_MANAGERS.map((pm) => (
                <SelectItem
                  key={pm.id}
                  value={pm.id}
                  className="text-xs cursor-pointer rounded-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{pm.name}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {pm.email}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {data.managerId && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...data, managerId: "" })}
              type="button"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </Field>

      <Field label="Property Name" required error={errors.propertyName}>
        <Input
          className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.propertyName ? "border-red-400" : ""}`}
          placeholder="e.g. Ridgeways Apartments"
          value={data.propertyName}
          onChange={(e) => onChange({ ...data, propertyName: e.target.value })}
        />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-0 resize-none min-h-[100px] placeholder:text-muted-foreground placeholder:text-xs"
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
          className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.physicalAddress ? "border-red-400" : ""}`}
          placeholder="e.g. 14 Ridgeways Close, off Kiambu Road"
          value={data.physicalAddress}
          onChange={(e) =>
            onChange({ ...data, physicalAddress: e.target.value })
          }
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Country" required error={errors.country}>
          <Select
            value={data.country}
            onValueChange={(v) => onChange({ ...data, country: v })}
          >
            <SelectTrigger
              className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.country ? "border-red-400" : ""}`}
            >
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {COUNTRIES.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  className="text-xs cursor-pointer rounded-sm"
                >
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="County" required error={errors.county}>
          {data.country === "Kenya" ? (
            <Select
              value={data.county}
              onValueChange={(v) => onChange({ ...data, county: v })}
            >
              <SelectTrigger
                className={`h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.county ? "border-red-400" : ""}`}
              >
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent className="p-1 rounded-md">
                {KENYA_COUNTIES.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="text-xs cursor-pointer rounded-sm"
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.county ? "border-red-400" : ""}`}
              placeholder="County / State / Province"
              value={data.county}
              onChange={(e) => onChange({ ...data, county: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City" required error={errors.city}>
          <Input
            className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.city ? "border-red-400" : ""}`}
            placeholder="e.g. Nairobi"
            value={data.city}
            onChange={(e) => onChange({ ...data, city: e.target.value })}
          />
        </Field>

        <Field label="Location / Neighbourhood" error={errors.location}>
          <Input
            className="h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
            placeholder="e.g. Ridgeways, Westlands"
            value={data.location}
            onChange={(e) => onChange({ ...data, location: e.target.value })}
          />
        </Field>
      </div>

      {/* Map placeholder — v2 */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 h-40 flex flex-col items-center justify-center gap-2">
        <MapPin className="size-4 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          Interactive map coming in v2
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Contacts ─────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onChange,
  onRemove,
  canRemove,
}: {
  contact: Contact;
  onChange: (c: Contact) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {contact.isPrimary ? (
          <Badge
            variant="outline"
            className="text-xs font-semibold bg-[#2D64C8]/5 text-[#2D64C8] border-[#2D64C8]/20"
          >
            Property Manager
          </Badge>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            Contact
          </span>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7 border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
              placeholder="Full name"
              value={contact.name}
              onChange={(e) => onChange({ ...contact, name: e.target.value })}
              disabled={contact.isPrimary}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Role <span className="text-red-500">*</span>
          </Label>
          <Select
            value={contact.role}
            onValueChange={(v) => onChange({ ...contact, role: v })}
            disabled={contact.isPrimary}
          >
            <SelectTrigger className="h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {ROLES.map((r) => (
                <SelectItem
                  key={r}
                  value={r}
                  className="text-xs cursor-pointer rounded-sm"
                >
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Phone <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7 border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
              placeholder="+254 7XX XXX XXX"
              value={contact.phone}
              onChange={(e) => onChange({ ...contact, phone: e.target.value })}
              disabled={contact.isPrimary}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">Email</Label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7 border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
              placeholder="email@example.com"
              value={contact.email}
              onChange={(e) => onChange({ ...contact, email: e.target.value })}
              disabled={contact.isPrimary}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-xs font-medium text-foreground">
            WhatsApp Number
          </Label>
          <div className="relative">
            <MessageCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7 border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs"
              placeholder="+254 7XX XXX XXX (if different from phone)"
              value={contact.whatsapp}
              onChange={(e) =>
                onChange({ ...contact, whatsapp: e.target.value })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange,
  contactError,
}: {
  data: Step3Data;
  onChange: (d: Step3Data) => void;
  contactError?: string;
}) {
  const addContact = () => {
    onChange({
      contacts: [
        ...data.contacts,
        {
          id: crypto.randomUUID(),
          name: "",
          role: "",
          phone: "",
          email: "",
          whatsapp: "",
          isPrimary: false,
        },
      ],
    });
  };

  const updateContact = (id: string, updated: Contact) => {
    onChange({
      contacts: data.contacts.map((c) => (c.id === id ? updated : c)),
    });
  };

  const removeContact = (id: string) => {
    onChange({ contacts: data.contacts.filter((c) => c.id !== id) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Contacts</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add contacts for this property. The property manager has been
          pre-filled.
        </p>
      </div>

      {contactError && <p className="text-xs text-red-500">{contactError}</p>}

      <div className="flex flex-col gap-3">
        {data.contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            onChange={(updated) => updateContact(contact.id, updated)}
            onRemove={() => removeContact(contact.id)}
            canRemove={!contact.isPrimary}
          />
        ))}
      </div>

      <Button
        variant="outline"
        className="gap-1.5 text-xs h-8 w-full border-dashed hover:bg-white cursor-pointer"
        onClick={addContact}
      >
        <Plus className="size-3.5" /> Add Contact
      </Button>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep1(data: Step1Data): FieldErrors<Step1Data> {
  const errors: FieldErrors<Step1Data> = {};
  if (!data.managerId) errors.managerId = "Please select a property manager.";
  if (!data.propertyName.trim())
    errors.propertyName = "Property name is required.";
  return errors;
}

function validateStep2(data: Step2Data): FieldErrors<Step2Data> {
  const errors: FieldErrors<Step2Data> = {};
  if (!data.physicalAddress.trim())
    errors.physicalAddress = "Physical address is required.";
  if (!data.country) errors.country = "Please select a country.";
  if (!data.county.trim()) errors.county = "County is required.";
  if (!data.city.trim()) errors.city = "City is required.";
  return errors;
}

function validateStep3(data: Step3Data): string | undefined {
  for (const c of data.contacts) {
    if (!c.name.trim() || !c.role || !c.phone.trim()) {
      return "Each contact must have a name, role, and phone number.";
    }
  }
  return undefined;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewPropertyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [step1, setStep1] = useState<Step1Data>({
    managerId: "",
    propertyName: "",
    description: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    physicalAddress: "",
    country: "Kenya",
    county: "",
    city: "",
    location: "",
  });
  const [step3, setStep3] = useState<Step3Data>({ contacts: [] });

  const [errors1, setErrors1] = useState<FieldErrors<Step1Data>>({});
  const [errors2, setErrors2] = useState<FieldErrors<Step2Data>>({});
  const [contactError, setContactError] = useState<string | undefined>();

  const buildContactsForStep3 = useCallback(
    (managerId: string, existingContacts: Contact[]): Contact[] => {
      const manager = PROPERTY_MANAGERS.find((pm) => pm.id === managerId);
      const primaryContact: Contact = {
        id: "primary",
        name: manager?.name ?? "",
        role: "Property Manager",
        phone: manager?.phone ?? "",
        email: manager?.email ?? "",
        whatsapp: "",
        isPrimary: true,
      };
      const rest = existingContacts.filter((c) => !c.isPrimary);
      return [primaryContact, ...rest];
    },
    [],
  );

  const handleNext = () => {
    if (step === 1) {
      const errs = validateStep1(step1);
      if (Object.keys(errs).length) {
        setErrors1(errs);
        return;
      }
      setErrors1({});
      setStep3((prev) => ({
        contacts: buildContactsForStep3(step1.managerId, prev.contacts),
      }));
      setStep(2);
    } else if (step === 2) {
      const errs = validateStep2(step2);
      if (Object.keys(errs).length) {
        setErrors2(errs);
        return;
      }
      setErrors2({});
      setStep(3);
    }
  };

  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    const err = validateStep3(step3);
    if (err) {
      setContactError(err);
      return;
    }
    setContactError(undefined);
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
        {/* Header */}
        {/* <div className="flex items-center gap-3">
          <Link href="/portal/properties">
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              New Property
            </h1>
            <p className="text-xs text-muted-foreground">
              Step {step} of {STEPS.length} —{" "}
              {STEPS.find((s) => s.number === step)?.label}
            </p>
          </div>
        </div> */}

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Form card */}
        <div className="rounded-lg border bg-white p-4 flex flex-col gap-4">
          {step === 1 && (
            <Step1 data={step1} onChange={setStep1} errors={errors1} />
          )}
          {step === 2 && (
            <Step2 data={step2} onChange={setStep2} errors={errors2} />
          )}
          {step === 3 && (
            <Step3
              data={step3}
              onChange={setStep3}
              contactError={contactError}
            />
          )}


          {/* Navigation */}
          <div className="flex items-center justify-between ">
            <Button
              variant="outline"
              className="gap-1.5 text-xs h-8 px-3 cursor-pointer w-36"
              onClick={handlePrev}
              disabled={step === 1}
            >
              <ArrowLeft className="size-3.5" /> Previous
            </Button>

            {step < 3 ? (
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
