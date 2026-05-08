"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Loader2, KeyRound, Pencil, X, Droplets,
  AlertTriangle, User, Phone, Mail, ExternalLink,
  FileText, Download, Image as ImageIcon,
  CreditCard, Users, Wrench, Plus, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "details" | "lease" | "billing" | "maintenance";

type OccupancyStatus = "VACANT" | "OCCUPIED";

type OnboardingStatus =
  | "PENDING" | "DOCUMENTS_SUBMITTED" | "KYC_APPROVED"
  | "KYC_REJECTED" | "LEASE_SIGNED" | "ACTIVE" | "INACTIVE";

type LeaseTerms = {
  leaseDurationMonths?:  number;
  noticePeriodDays?:     number;
  latePenaltyPercent?:   number;
  latePenaltyGraceDays?: number;
  paymentDay?:           number;
};

type UnitType = {
  _id: string;
  name: string;
  rentAmount: number;
  depositAmount?: number;
  agreementFilename?: string;
  agreementTerms?: Record<string, unknown>;
};

type Unit = {
  _id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number;
  occupancyStatus: OccupancyStatus;
  leaseTerms?: LeaseTerms;
  createdAt: string;
  property: {
    _id: string;
    propertyName: string;
    slug: string;
    billing: { rentDueDay: number; paymentMethods: string[] };
    unitTypes: UnitType[];
  };
  currentTenant: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    onboardingStatus: OnboardingStatus;
    leaseRecord?: {
      startDate?: string;
      endDate?: string;
      rentAmount?: number;
      depositAmount?: number;
      documentPath?: string;
      signedAt?: string;
    };
  } | null;
};

type WaterReading = {
  _id: string;
  readingDate: string;
  reading: number;
  previousReading: number;
  consumption: number;
  rateUsed: number;
  amount: number;
  photoUrl?: string;
  invoiceId: string | null;
};

type WaterRate = { _id: string; ratePerUnit: number; effectiveFrom: string } | null;

type TenantHistory = {
  _id: string;
  fullName: string;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
  leaseRecord?: { startDate?: string; endDate?: string; rentAmount?: number };
};

type PaymentEntry = {
  _id:             string;
  type:            "deposit" | "first_rent" | "rent" | "water";
  date:            string;
  amount:          number;
  tenantName:      string;
  reference?:      string;
  paymentForMonth?: string;
  paymentMethod?:  string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE")}`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<OnboardingStatus, { label: string; cls: string }> = {
  PENDING:             { label: "Pending",        cls: "bg-muted text-muted-foreground border-border" },
  DOCUMENTS_SUBMITTED: { label: "Docs Submitted", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  KYC_APPROVED:        { label: "KYC Approved",   cls: "bg-sky-50 text-sky-700 border-sky-200" },
  KYC_REJECTED:        { label: "KYC Rejected",   cls: "bg-red-50 text-red-700 border-red-200" },
  LEASE_SIGNED:        { label: "Lease Signed",   cls: "bg-violet-50 text-violet-700 border-violet-200" },
  ACTIVE:              { label: "Active",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INACTIVE:            { label: "Inactive",        cls: "bg-muted text-muted-foreground border-border" },
};

function TenantStatusBadge({ status }: { status: OnboardingStatus }) {
  const m = STATUS_META[status] ?? { label: status ?? "Unknown", cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${m.cls}`}>
      {m.label}
    </span>
  );
}

const PAYMENT_LABELS: Record<PaymentEntry["type"], { label: string; cls: string }> = {
  deposit:    { label: "Deposit",    cls: "bg-violet-50 text-violet-700 border-violet-200" },
  first_rent: { label: "First Rent", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  rent:       { label: "Rent",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  water:      { label: "Water Bill", cls: "bg-sky-50 text-sky-700 border-sky-200" },
};

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

type EditForm = {
  unitNumber: string;
  rentAmount: string;
  depositAmount: string;
  occupancyStatus: OccupancyStatus;
  leaseDurationMonths: string;
  noticePeriodDays: string;
  latePenaltyPercent: string;
  latePenaltyGraceDays: string;
  paymentDay: string;
};

function EditSheet({
  open, onClose, unit, onSaved,
}: { open: boolean; onClose: () => void; unit: Unit; onSaved: (u: Unit) => void }) {
  const [form, setForm] = useState<EditForm>({
    unitNumber: "", rentAmount: "", depositAmount: "",
    occupancyStatus: "VACANT",
    leaseDurationMonths: "", noticePeriodDays: "",
    latePenaltyPercent: "", latePenaltyGraceDays: "", paymentDay: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      unitNumber:           unit.unitNumber,
      rentAmount:           String(unit.rentAmount),
      depositAmount:        String(unit.depositAmount),
      occupancyStatus:      unit.occupancyStatus,
      leaseDurationMonths:  String(unit.leaseTerms?.leaseDurationMonths  ?? ""),
      noticePeriodDays:     String(unit.leaseTerms?.noticePeriodDays     ?? ""),
      latePenaltyPercent:   String(unit.leaseTerms?.latePenaltyPercent   ?? ""),
      latePenaltyGraceDays: String(unit.leaseTerms?.latePenaltyGraceDays ?? ""),
      paymentDay:           String(unit.leaseTerms?.paymentDay           ?? ""),
    });
  }, [open, unit]);

  const f = (k: keyof EditForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!form.unitNumber.trim()) { toast.error("Unit number is required"); return; }
    if (isNaN(Number(form.rentAmount))    || Number(form.rentAmount)    < 0) { toast.error("Invalid rent amount"); return; }
    if (isNaN(Number(form.depositAmount)) || Number(form.depositAmount) < 0) { toast.error("Invalid deposit amount"); return; }

    const leaseTerms: LeaseTerms = {};
    if (form.leaseDurationMonths)  leaseTerms.leaseDurationMonths  = Number(form.leaseDurationMonths);
    if (form.noticePeriodDays)     leaseTerms.noticePeriodDays     = Number(form.noticePeriodDays);
    if (form.latePenaltyPercent)   leaseTerms.latePenaltyPercent   = Number(form.latePenaltyPercent);
    if (form.latePenaltyGraceDays) leaseTerms.latePenaltyGraceDays = Number(form.latePenaltyGraceDays);
    if (form.paymentDay)           leaseTerms.paymentDay           = Number(form.paymentDay);

    setSaving(true);
    try {
      const res  = await fetch(`/api/units/${unit._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber:      form.unitNumber.trim(),
          rentAmount:      Number(form.rentAmount),
          depositAmount:   Number(form.depositAmount),
          occupancyStatus: form.occupancyStatus,
          leaseTerms:      Object.keys(leaseTerms).length ? leaseTerms : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      onSaved({ ...unit, ...json.data });
      toast.success("Unit updated.");
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed."); }
    finally { setSaving(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-sm font-semibold">Edit Unit</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Unit {unit.unitNumber}</p>
          </div>
          <button onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Unit Details</p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Unit Number <span className="text-red-500">*</span></Label>
              <Input className="h-8 text-xs" value={form.unitNumber} onChange={(e) => f("unitNumber")(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Monthly Rent (KES)</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={form.rentAmount} onChange={(e) => f("rentAmount")(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Deposit (KES)</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={form.depositAmount} onChange={(e) => f("depositAmount")(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Occupancy Status</Label>
              <Select value={form.occupancyStatus} onValueChange={(v) => f("occupancyStatus")(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="p-1 rounded-md">
                  <SelectItem value="VACANT"   className="text-xs cursor-pointer rounded-sm">Vacant</SelectItem>
                  <SelectItem value="OCCUPIED" className="text-xs cursor-pointer rounded-sm">Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Lease Terms <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Lease Duration (months)</Label>
                <Input type="number" min={1} className="h-8 text-xs" value={form.leaseDurationMonths} onChange={(e) => f("leaseDurationMonths")(e.target.value)} placeholder="e.g. 12" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Notice Period (days)</Label>
                <Input type="number" min={1} className="h-8 text-xs" value={form.noticePeriodDays} onChange={(e) => f("noticePeriodDays")(e.target.value)} placeholder="e.g. 30" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Late Penalty (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} className="h-8 text-xs" value={form.latePenaltyPercent} onChange={(e) => f("latePenaltyPercent")(e.target.value)} placeholder="e.g. 5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Grace Days</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={form.latePenaltyGraceDays} onChange={(e) => f("latePenaltyGraceDays")(e.target.value)} placeholder="e.g. 5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Payment Day (1–28)</Label>
                <Input type="number" min={1} max={28} className="h-8 text-xs" value={form.paymentDay} onChange={(e) => f("paymentDay")(e.target.value)} placeholder="e.g. 1" />
              </div>
            </div>
          </div> */}
        </div>

        <div className="border-t px-4 py-3 flex justify-end gap-2">
          <Button variant="outline" className="h-8 text-xs" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-3 animate-spin" />} Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────

function DetailsTab({ unit }: { unit: Unit }) {
  const router     = useRouter();
  const isOccupied = unit.occupancyStatus === "OCCUPIED";

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-xs font-semibold mb-4">Unit Details</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Unit Name</p>
          <p className="text-sm font-semibold">{unit.unitNumber}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Property</p>
          <button
            className="text-xs font-medium text-[#2D64C8] hover:underline text-left"
            onClick={() => router.push(`/properties/${unit.property.slug}`)}
          >
            {unit.property.propertyName}
          </button>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Date Added</p>
          <p className="text-xs font-medium">{fmtDate(unit.createdAt)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Monthly Rent</p>
          <p className="text-sm font-semibold ">{fmtKES(unit.rentAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Deposit</p>
          <p className="text-sm font-semibold">{fmtKES(unit.depositAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Billing Date</p>
          <p className="text-xs font-medium">{ordinal(unit.property.billing.rentDueDay)} of each month</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Status</p>
          <Badge
            variant="outline"
            className={isOccupied
              ? "bg-green-50 text-green-700 border-green-300 text-xs font-semibold"
              : "text-xs font-semibold text-muted-foreground border-border"
            }
          >
            {isOccupied ? "Occupied" : "Vacant"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ─── Lease & Tenants Tab ──────────────────────────────────────────────────────

function LeaseTenantsTab({ unit }: { unit: Unit }) {
  const router  = useRouter();
  const [history,    setHistory]    = useState<TenantHistory[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/units/${unit._id}/tenants`)
      .then((r) => r.json())
      .then((j) => setHistory(j.data ?? []))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [unit._id]);

  const tenant  = unit.currentTenant;
  const hasDoc  = !!tenant?.leaseRecord?.documentPath;
  const propUnitTypes = unit.property.unitTypes.filter((ut) => ut.agreementFilename);

  return (
    <div className="flex flex-col gap-4">

      {/* Current Tenant */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
 Current Tenant
        </h3>
        {tenant ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
             
              <div className="min-w-0 gap-2 flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs ">{tenant.fullName}</p>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3" /> {tenant.phone}
                  </span>
                  {tenant.email && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3" /> {tenant.email}
                    </span>
                  )}
                </div>
                {tenant.leaseRecord?.startDate && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Lease: {fmtDate(tenant.leaseRecord.startDate)} — {fmtDate(tenant.leaseRecord.endDate)}
                  </p>
                )}
              </div>
            </div>
            {/* <Button
              variant="outline"
              className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
              onClick={() => router.push(`/tenants/${tenant._id}`)}
            >
              <ExternalLink className="size-3.5" /> View
            </Button> */}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground py-2">

            <p className="text-xs">No tenant currently assigned to this unit.</p>
          </div>
        )}
      </div>

      {/* Lease Documents */}
      <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
        <h3 className="text-xs font-semibold">Lease Documents</h3>

        {/* Landlord templates (from unit types) */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Landlord Templates
          </p>
          {propUnitTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No agreement templates uploaded for this property&apos;s unit types.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {propUnitTypes.map((ut) => (
                <div key={ut._id} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ut.agreementFilename}</p>
                    <p className="text-[11px] text-muted-foreground">{ut.name}</p>
                  </div>
                  <a
                    href={`/api/properties/${unit.property.slug}/unit-types/${ut._id}/agreement`}
                    download={ut.agreementFilename}
                    className="flex items-center gap-1 text-[11px] text-[#2D64C8] hover:underline shrink-0"
                  >
                    <Download className="size-3" /> Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tenant signed document */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Tenant&apos;s Signed Lease
          </p>
          {tenant ? (
            hasDoc ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Signed lease document</p>
                  {tenant.leaseRecord?.signedAt && (
                    <p className="text-[11px] text-muted-foreground">Signed {fmtDate(tenant.leaseRecord.signedAt)}</p>
                  )}
                </div>
                <a
                  href={`/api/tenants/${tenant._id}/lease`}
                  download
                  className="flex items-center gap-1 text-[11px] text-[#2D64C8] hover:underline shrink-0"
                >
                  <Download className="size-3" /> Download
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tenant has not uploaded a signed lease document yet.
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">No active tenant — no signed document on file.</p>
          )}
        </div>
      </div>

      {/* Tenant History */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">

          <h3 className="text-xs font-semibold">Tenant History</h3>
        </div>

        {histLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5">
            <Users className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No tenant history for this unit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Tenant", "Status", "Moved In", "Moved Out", "Rent"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">{h}</th>
                  ))}
                  <th className="py-2.5 px-4 border-b" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer "
                    onClick={() => router.push(`/tenants/${t._id}`)}
                  >
                    <td className="py-3 px-4 font-medium">{t.fullName}</td>
                    <td className="py-3 px-4">
                      <TenantStatusBadge status={t.onboardingStatus} />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {fmtDate(t.leaseRecord?.startDate)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {t.onboardingStatus === "INACTIVE"
                        ? fmtDate(t.leaseRecord?.endDate)
                        : <span className="text-emerald-600 font-medium">Current</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {t.leaseRecord?.rentAmount ? fmtKES(t.leaseRecord.rentAmount) : "—"}
                    </td>
                    <td className="py-3 px-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="p-1.5 rounded-md text-muted-foreground hover:text-[#2D64C8] hover:bg-[#2D64C8]/10 transition-colors"
                        onClick={() => router.push(`/tenants/${t._id}`)}
                      >
                        <ExternalLink className="size-3.5" />
                      </button>
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

// ─── Water Section ────────────────────────────────────────────────────────────

function WaterSection({ unit }: { unit: Unit }) {
  const [readings,     setReadings]     = useState<WaterReading[]>([]);
  const [currentRate,  setCurrentRate]  = useState<WaterRate>(null);
  const [loading,      setLoading]      = useState(true);
  const [readingInput, setReadingInput] = useState("");
  const [dateInput,    setDateInput]    = useState(todayISO());
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [formError,    setFormError]    = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const hasFetched    = useRef(false);

  const lastReading     = readings[0] ?? null;
  const previousReading = lastReading?.reading ?? 0;
  const parsedInput     = Number(readingInput);
  const inputValid      = readingInput !== "" && !isNaN(parsedInput) && parsedInput >= previousReading;
  const consumption     = inputValid ? parsedInput - previousReading : null;
  const previewAmount   = consumption !== null && currentRate ? consumption * currentRate.ratePerUnit : null;

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchData() {
      try {
        const [readingsRes, rateRes] = await Promise.all([
          fetch(`/api/units/${unit._id}/water-readings`),
          fetch(`/api/properties/${unit.property.slug}/water-rate`),
        ]);
        if (readingsRes.ok) setReadings((await readingsRes.json()).data ?? []);
        if (rateRes.ok)     setCurrentRate((await rateRes.json()).data?.current ?? null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [unit._id, unit.property.slug]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function record() {
    if (!inputValid) return;
    setSubmitting(true);
    setFormError(null);
    try {
      let body: BodyInit;
      let headers: HeadersInit = {};

      if (photoFile) {
        const fd = new FormData();
        fd.append("reading",     String(parsedInput));
        fd.append("readingDate", dateInput);
        fd.append("photo",       photoFile);
        body = fd;
      } else {
        body    = JSON.stringify({ reading: parsedInput, readingDate: dateInput });
        headers = { "Content-Type": "application/json" };
      }

      const res  = await fetch(`/api/units/${unit._id}/water-readings`, {
        method: "POST", headers, body,
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.message ?? "Failed"); return; }
      setReadings((p) => [json.data, ...p]);
      setReadingInput("");
      setDateInput(todayISO());
      setPhotoFile(null);
      setPhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      toast.success("Reading recorded.");
    } catch {
      setFormError("Failed to record reading.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b flex items-center gap-2">

        <h3 className="text-xs font-semibold">Water Billing</h3>
        {currentRate && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            Rate: <span className="font-medium text-foreground">{fmtKES(currentRate.ratePerUnit)} / unit</span>
            {" "}· since {fmtDate(currentRate.effectiveFrom)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-4">
          {!currentRate && (
            <div className="rounded-lg border bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex gap-4">
                <p className="text-xs font-medium text-amber-800">No water rate configured</p>
                <p className="text-[11px] text-amber-700">Set a water rate for this property before recording readings.</p>
              </div>
            </div>
          )}

          {lastReading && (
            <div className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Last reading</p>
                <p className="text-sm font-semibold tabular-nums">{lastReading.reading.toLocaleString("en-KE")} units</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(lastReading.readingDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Consumption</p>
                <p className="text-sm font-semibold tabular-nums">{lastReading.consumption.toLocaleString("en-KE")} units</p>
                <p className="text-[11px] font-medium text-[#2D64C8]">{fmtKES(lastReading.amount)}</p>
              </div>
            </div>
          )}

          {currentRate && (
            <div className="rounded-lg border bg-white p-3 flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Record New Reading</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Current Reading <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number" min={previousReading} placeholder={String(previousReading)}
                    className="h-8 text-xs" value={readingInput}
                    onChange={(e) => { setReadingInput(e.target.value); setFormError(null); }}
                  />
                  {readingInput !== "" && parsedInput < previousReading && (
                    <p className="text-[11px] text-red-500">Must be ≥ {previousReading.toLocaleString("en-KE")}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Reading Date</label>
                  <Input type="date" className="h-8 text-xs" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
                </div>
              </div>

              {/* Photo upload */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Meter Photo (optional)</label>
                {photoPreview ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Meter" className="h-24 w-auto rounded-md border object-cover" />
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-white border shadow flex items-center justify-center text-muted-foreground hover:text-red-500"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ""; }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-dashed border-border text-muted-foreground hover:border-[#2D64C8]/50 hover:text-[#2D64C8] transition-colors w-fit"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImageIcon className="size-3" /> Upload photo
                  </button>
                )}
                <input
                  ref={photoInputRef} type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {consumption !== null && previewAmount !== null && (
                <div className="rounded-md bg-[#2D64C8]/5 border border-[#2D64C8]/20 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {consumption.toLocaleString("en-KE")} units × {fmtKES(currentRate.ratePerUnit)}
                  </span>
                  <span className="text-xs font-semibold text-[#2D64C8]">{fmtKES(previewAmount)}</span>
                </div>
              )}
              {formError && <p className="text-[11px] text-red-500">{formError}</p>}
              <Button
                className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 w-fit"
                disabled={!inputValid || submitting} onClick={record}
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Record Reading"}
              </Button>
            </div>
          )}

          {/* History */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reading History</p>
            {readings.length === 0 ? (
              <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-8 gap-1.5">
                <Droplets className="size-5 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No readings recorded yet.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Date", "Reading", "Units", "Amount", "Photo", ""].map((h) => (
                          <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground text-[11px] border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {readings.map((r) => (
                        <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.readingDate)}</td>
                          <td className="py-2.5 px-3 font-medium tabular-nums">{r.reading.toLocaleString("en-KE")}</td>
                          <td className="py-2.5 px-3 tabular-nums">{r.consumption.toLocaleString("en-KE")}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#2D64C8] tabular-nums">{fmtKES(r.amount)}</td>
                          <td className="py-2.5 px-3">
                            {r.photoUrl ? (
                              <a href={r.photoUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[#2D64C8] hover:underline">
                                <ImageIcon className="size-3" /> View
                              </a>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {r.invoiceId
                              ? <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">Billed</span>
                              : <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Pending</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Billing & Payments Tab ───────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  MPESA: "M-Pesa", BANK_TRANSFER: "Bank Transfer", CASH: "Cash",
};

function BillingPaymentsTab({ unit }: { unit: Unit }) {
  const [payments,   setPayments]   = useState<PaymentEntry[]>([]);
  const [payLoading, setPayLoading] = useState(true);

  // Log payment form state
  const [showForm,    setShowForm]    = useState(false);
  const [amount,      setAmount]      = useState("");
  const [method,      setMethod]      = useState("MPESA");
  const [ref,         setRef]         = useState("");
  const [forMonth,    setForMonth]    = useState(currentMonthISO());
  const [payDate,     setPayDate]     = useState(todayISO());
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    fetch(`/api/units/${unit._id}/payments`)
      .then((r) => r.json())
      .then((j) => setPayments(j.data ?? []))
      .catch(() => {})
      .finally(() => setPayLoading(false));
  }, [unit._id]);

  async function logPayment() {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount."); return; }
    if (!ref.trim())                        { toast.error("Transaction reference is required."); return; }

    setSaving(true);
    try {
      const res  = await fetch(`/api/units/${unit._id}/payments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount: amt, paymentMethod: method,
          transactionRef: ref.trim(), paymentForMonth: forMonth, paymentDate: payDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Failed to log payment");
      setPayments((prev) => [json.data, ...prev]);
      setAmount(""); setRef(""); setForMonth(currentMonthISO()); setPayDate(todayISO());
      setShowForm(false);
      toast.success("Payment logged.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log payment.");
    } finally {
      setSaving(false);
    }
  }

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <WaterSection unit={unit} />

      {/* All payments */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <CreditCard className="size-3.5 text-muted-foreground" /> Payment History
            </h3>
            {!payLoading && payments.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Total received: <span className="font-semibold text-foreground">{fmtKES(total)}</span>
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="h-7 text-[11px] gap-1 px-2.5 cursor-pointer shrink-0"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="size-3" /> Log Payment
          </Button>
        </div>

        {/* Log payment form */}
        {showForm && (
          <div className="px-4 py-4 border-b bg-muted/20">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Log Rent Payment
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Amount (KES) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number" min={0} step={0.01}
                  placeholder={`e.g. ${unit.rentAmount.toLocaleString("en-KE")}`}
                  className="h-8 text-xs w-36"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Method <span className="text-red-500">*</span></label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-8 text-xs w-36 focus:ring-0 focus-visible:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MPESA"         className="text-xs cursor-pointer">M-Pesa</SelectItem>
                    <SelectItem value="BANK_TRANSFER"  className="text-xs cursor-pointer">Bank Transfer</SelectItem>
                    <SelectItem value="CASH"           className="text-xs cursor-pointer">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-36">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Transaction Ref <span className="text-red-500">*</span>
                </label>
                <Input
                  className="h-8 text-xs"
                  placeholder={method === "MPESA" ? "e.g. QAE1234567" : method === "BANK_TRANSFER" ? "e.g. TXN00123" : "e.g. RCT-001"}
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">For Month <span className="text-red-500">*</span></label>
                <Input
                  type="month"
                  className="h-8 text-xs w-36"
                  value={forMonth}
                  onChange={(e) => setForMonth(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Date Received</label>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5"
                  disabled={saving}
                  onClick={logPayment}
                >
                  {saving
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <CheckCircle2 className="size-3.5" />
                  }
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="ghost" className="h-8 text-xs" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>

            {/* Preview note */}
            {unit.rentAmount > 0 && amount && Number(amount) > 0 && (
              <div className={`mt-3 rounded-md px-3 py-2 text-[11px] flex items-center gap-2 border ${
                Number(amount) >= unit.rentAmount
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}>
                {Number(amount) >= unit.rentAmount
                  ? <CheckCircle2 className="size-3.5 shrink-0" />
                  : <AlertTriangle className="size-3.5 shrink-0" />
                }
                {Number(amount) >= unit.rentAmount
                  ? `Full payment — rent is ${fmtKES(unit.rentAmount)}`
                  : `Partial payment — rent is ${fmtKES(unit.rentAmount)}, balance will be ${fmtKES(unit.rentAmount - Number(amount))}`
                }
              </div>
            )}
          </div>
        )}

        {payLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5">
            <CreditCard className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No payment history for this unit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Type", "Tenant", "For Month", "Amount", "Method", "Reference"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                  const meta = PAYMENT_LABELS[p.type];
                  return (
                    <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.tenantName}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {p.paymentForMonth
                          ? new Date(p.paymentForMonth + "-02").toLocaleDateString("en-KE", { month: "short", year: "numeric" })
                          : "—"
                        }
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                        {fmtKES(p.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {p.paymentMethod
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                              {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                            </span>
                          : <span className="text-muted-foreground/40">—</span>
                        }
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {p.reference ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Maintenance Tab ──────────────────────────────────────────────────────────

type MaintenanceRecord = {
  _id: string;
  issueDescription: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  photoUrl?: string;
  tenantId?: { _id: string; fullName: string } | null;
  createdAt: string;
  resolvedAt?: string;
};

const URGENCY_META: Record<MaintenanceRecord["urgency"], { label: string; cls: string }> = {
  LOW:    { label: "Low",    cls: "bg-muted text-muted-foreground border-border" },
  MEDIUM: { label: "Medium", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  HIGH:   { label: "High",   cls: "bg-red-50 text-red-700 border-red-200" },
};

const STATUS_M: Record<MaintenanceRecord["status"], { label: string; cls: string }> = {
  PENDING:     { label: "Pending",     cls: "bg-muted text-muted-foreground border-border" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  RESOLVED:    { label: "Resolved",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function MaintenanceTab({ unit }: { unit: Unit }) {
  const [records,     setRecords]     = useState<MaintenanceRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [description, setDescription] = useState("");
  const [urgency,     setUrgency]     = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoPreview,setPhotoPreview]= useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/units/${unit._id}/maintenance`)
      .then((r) => r.json())
      .then((j) => setRecords(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unit._id]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!description.trim()) { toast.error("Issue description is required"); return; }
    setSubmitting(true);
    try {
      let body: BodyInit;
      let headers: HeadersInit = {};

      if (photoFile) {
        const fd = new FormData();
        fd.append("issueDescription", description.trim());
        fd.append("urgency", urgency);
        fd.append("photo", photoFile);
        body = fd;
      } else {
        body    = JSON.stringify({ issueDescription: description.trim(), urgency });
        headers = { "Content-Type": "application/json" };
      }

      const res  = await fetch(`/api/units/${unit._id}/maintenance`, { method: "POST", headers, body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      setRecords((p) => [json.data, ...p]);
      setDescription("");
      setUrgency("MEDIUM");
      setPhotoFile(null);
      setPhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      toast.success("Maintenance request recorded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Record form */}
      <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
        <h3 className="text-xs font-semibold">Record Maintenance Request</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Issue Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe the issue…"
            className="text-xs rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Urgency</label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-1 rounded-md">
                <SelectItem value="LOW"    className="text-xs cursor-pointer rounded-sm">Low</SelectItem>
                <SelectItem value="MEDIUM" className="text-xs cursor-pointer rounded-sm">Medium</SelectItem>
                <SelectItem value="HIGH"   className="text-xs cursor-pointer rounded-sm">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Photo (optional)</label>
            {photoPreview ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Issue" className="h-8 w-auto rounded border object-cover" />
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-white border shadow flex items-center justify-center text-muted-foreground hover:text-red-500"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ""; }}
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-dashed border-border text-muted-foreground hover:border-[#2D64C8]/50 hover:text-[#2D64C8] transition-colors"
                onClick={() => photoInputRef.current?.click()}
              >
                <ImageIcon className="size-3" /> Upload photo
              </button>
            )}
            <input
              ref={photoInputRef} type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <Button
            className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5 ml-auto"
            disabled={!description.trim() || submitting}
            onClick={submit}
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Wrench className="size-3.5" />}
            {submitting ? "Saving…" : "Record Request"}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Wrench className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold">Maintenance History</h3>
          {!loading && records.length > 0 && (
            <span className="ml-auto text-[11px] text-muted-foreground">{records.length} record{records.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5">
            <Wrench className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No maintenance requests recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Description", "Urgency", "Status", "Reported By", "Photo"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => {
                  const urg = URGENCY_META[r.urgency] ?? URGENCY_META.MEDIUM;
                  const st  = STATUS_M[r.status]     ?? STATUS_M.PENDING;
                  return (
                    <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="truncate" title={r.issueDescription}>{r.issueDescription}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urg.cls}`}>
                          {urg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {r.tenantId?.fullName ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {r.photoUrl ? (
                          <a href={r.photoUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#2D64C8] hover:underline">
                            <ImageIcon className="size-3" /> View
                          </a>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Strip ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: "details",     label: "Details" },
  { key: "lease",       label: "Lease & Tenants" },
  { key: "billing",     label: "Billing & Payments" },
  { key: "maintenance", label: "Maintenance" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UnitDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [unit,      setUnit]      = useState<Unit | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [editOpen,  setEditOpen]  = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;
    if (tab && TABS.some((t) => t.key === tab)) setActiveTab(tab);
  }, [searchParams]);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/units/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      const json = await res.json();
      setUnit(json.data);
    } catch { toast.error("Failed to load unit."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-full bg-[#F0F4F8]">
      <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
    </div>
  );

  if (notFound || !unit) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-[#F0F4F8] gap-3 p-8">
      <KeyRound className="size-8 text-muted-foreground/30" />
      <p className="text-sm font-medium">Unit not found</p>
      <Button variant="outline" className="h-8 text-xs gap-1.5" onClick={() => router.back()}>
        <ArrowLeft className="size-3.5" /> Go back
      </Button>
    </div>
  );

  const isOccupied = unit.occupancyStatus === "OCCUPIED";

  return (
    <>
      <EditSheet open={editOpen} onClose={() => setEditOpen(false)} unit={unit} onSaved={setUnit} />

      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
        {/* Sticky tab strip */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="px-4 pt-3 pb-0 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="outline" size="icon"
                  className="size-8 shrink-0 cursor-pointer"
                  onClick={() => router.push(`/properties/${unit.property.slug}?tab=units`)}
                >
                  <ArrowLeft className="size-3.5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold leading-tight">Unit {unit.unitNumber}</h1>
                  <p className="text-xs text-muted-foreground truncate">{unit.property.propertyName}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>

            <div className="flex items-center -mb-px">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? "border-[#2D64C8] text-[#2D64C8]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === "details" && (
            <DetailsTab unit={unit} />
          )}
          {activeTab === "lease" && (
            <LeaseTenantsTab unit={unit} />
          )}
          {activeTab === "billing" && (
            <BillingPaymentsTab unit={unit} />
          )}
          {activeTab === "maintenance" && (
            <MaintenanceTab unit={unit} />
          )}
        </div>
      </div>
    </>
  );
}
