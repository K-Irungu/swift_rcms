"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, User, CheckCircle2, Circle, AlertCircle,
  Lock, Upload, X, Pencil, UserX, UserCheck, FileText,
  ShieldCheck, ShieldX, FileSignature, Banknote, ChevronDown,
  ChevronUp, Phone, Mail, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingStatus =
  | "PENDING" | "DOCUMENTS_SUBMITTED" | "KYC_APPROVED"
  | "KYC_REJECTED" | "LEASE_SIGNED" | "ACTIVE" | "INACTIVE";

type UnitRef = { _id: string; unitNumber: string; occupancyStatus?: string };

type Tenant = {
  _id: string;
  fullName: string; email?: string; phone: string; nationalId: string;
  emergencyContactName?: string; emergencyContactPhone?: string;
  unitId?: UnitRef | null;
  onboardingStatus: OnboardingStatus;
  kyc?: {
    idType: "national_id" | "passport";
    submittedAt: string; reviewedAt?: string; rejectionReason?: string;
  };
  leaseRecord?: {
    unitId: string; startDate: string; endDate: string;
    rentAmount: number; depositAmount: number; signedAt?: string;
  };
  moveInPayment?: {
    depositExpected: number; depositReceived: number; depositReference?: string;
    firstRentExpected: number; firstRentReceived: number; firstRentReference?: string;
  };
  notes?: string;
  createdAt: string;
  property: { _id: string; propertyName: string; slug: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
function fmtKES(n?: number) {
  if (n == null) return "—";
  return `KES ${n.toLocaleString("en-KE")}`;
}

const STAGE_ORDER: OnboardingStatus[] = [
  "PENDING", "DOCUMENTS_SUBMITTED", "KYC_APPROVED", "LEASE_SIGNED", "ACTIVE",
];

function stageIndex(s: OnboardingStatus) {
  if (s === "KYC_REJECTED") return STAGE_ORDER.indexOf("DOCUMENTS_SUBMITTED");
  return STAGE_ORDER.indexOf(s);
}

// ─── Onboarding status badge ──────────────────────────────────────────────────

const STATUS_META: Record<OnboardingStatus, { label: string; cls: string }> = {
  PENDING:             { label: "Pending",          cls: "bg-muted text-muted-foreground" },
  DOCUMENTS_SUBMITTED: { label: "Docs Submitted",   cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  KYC_APPROVED:        { label: "KYC Approved",     cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  KYC_REJECTED:        { label: "KYC Rejected",     cls: "bg-red-50 text-red-700 border border-red-200" },
  LEASE_SIGNED:        { label: "Lease Signed",     cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  ACTIVE:              { label: "Active",            cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  INACTIVE:            { label: "Inactive",          cls: "bg-muted text-muted-foreground border border-border" },
};

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${m.cls}`}>
      <span className={`size-1.5 rounded-full ${status === "ACTIVE" ? "bg-emerald-500" : status === "INACTIVE" ? "bg-muted-foreground" : status === "KYC_REJECTED" ? "bg-red-500" : "bg-current opacity-60"}`} />
      {m.label}
    </span>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

type StepState = "done" | "active" | "rejected" | "locked";

function StepIcon({ state }: { state: StepState }) {
  if (state === "done")     return <CheckCircle2 className="size-5 text-emerald-600" />;
  if (state === "rejected") return <AlertCircle  className="size-5 text-red-500" />;
  if (state === "active")   return <Circle       className="size-5 text-[#2D64C8]" />;
  return <Lock className="size-5 text-muted-foreground/40" />;
}

// ─── Edit basic info sheet ────────────────────────────────────────────────────

function EditSheet({
  open, onClose, tenant, onSaved,
}: { open: boolean; onClose: () => void; tenant: Tenant; onSaved: (t: Tenant) => void }) {
  const [form, setForm] = useState({ fullName: "", phone: "", nationalId: "", email: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ fullName: tenant.fullName, phone: tenant.phone, nationalId: tenant.nationalId, email: tenant.email ?? "", emergencyContactName: tenant.emergencyContactName ?? "", emergencyContactPhone: tenant.emergencyContactPhone ?? "", notes: tenant.notes ?? "" });
  }, [open, tenant]);

  const f = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    setSaving(true);
    try {
      const res  = await fetch(`/api/tenants/${tenant._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      onSaved({ ...tenant, ...json.data });
      toast.success("Updated."); onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed."); }
    finally { setSaving(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Edit Basic Info</h2>
          <button onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {([["fullName","Full Name","e.g. Jane Wanjiru"],["phone","Phone","+254 7XX XXX XXX"],["nationalId","National ID","ID number"],["email","Email","optional"]] as [keyof typeof form, string, string][]).map(([k,lbl,ph]) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">{lbl}</Label>
              <Input className="h-8 text-xs" value={form[k]} onChange={(e) => f(k)(e.target.value)} placeholder={ph} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Emergency Name</Label><Input className="h-8 text-xs" value={form.emergencyContactName} onChange={(e) => f("emergencyContactName")(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Emergency Phone</Label><Input className="h-8 text-xs" value={form.emergencyContactPhone} onChange={(e) => f("emergencyContactPhone")(e.target.value)} /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Notes</Label><textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none resize-none min-h-[60px]" value={form.notes} onChange={(e) => f("notes")(e.target.value)} /></div>
        </div>
        <div className="border-t px-4 py-3 flex justify-end gap-2">
          <Button variant="outline" className="h-8 text-xs" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5" onClick={submit} disabled={saving}>{saving && <Loader2 className="size-3 animate-spin" />}Save</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step panels ──────────────────────────────────────────────────────────────

// Step 2: KYC Document Upload
function KycUploadPanel({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [idType,   setIdType]   = useState<"national_id" | "passport">("national_id");
  const [idFront,  setIdFront]  = useState<File | null>(null);
  const [idBack,   setIdBack]   = useState<File | null>(null);
  const [selfie,   setSelfie]   = useState<File | null>(null);
  const [saving,   setSaving]   = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef  = useRef<HTMLInputElement>(null);
  const selfieRef= useRef<HTMLInputElement>(null);

  async function submit() {
    if (!idFront) { toast.error("ID front is required"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("idType", idType);
      fd.append("idFront", idFront);
      if (idBack)  fd.append("idBack",  idBack);
      if (selfie)  fd.append("selfie",  selfie);
      const res  = await fetch(`/api/tenants/${tenantId}/kyc`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Upload failed");
      toast.success("Documents submitted — awaiting review.");
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed."); }
    finally { setSaving(false); }
  }

  function FileSlot({ label, file, onFile, inputRef, required }: { label: string; file: File | null; onFile: (f: File) => void; inputRef: React.RefObject<HTMLInputElement | null>; required?: boolean }) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        {file ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <FileText className="size-3.5 text-[#2D64C8] shrink-0" />
            <span className="text-xs flex-1 truncate">{file.name}</span>
            <button type="button" onClick={() => onFile(null as unknown as File)} className="text-muted-foreground hover:text-red-500"><X className="size-3" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-dashed border-border text-muted-foreground hover:border-[#2D64C8]/60 hover:text-[#2D64C8] transition-colors w-fit">
            <Upload className="size-3" /> Choose file
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">Document Type <span className="text-red-500">*</span></Label>
        <Select value={idType} onValueChange={(v) => { setIdType(v as typeof idType); setIdBack(null); }}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1 rounded-md">
            <SelectItem value="national_id" className="text-xs cursor-pointer rounded-sm">Kenya National ID</SelectItem>
            <SelectItem value="passport"    className="text-xs cursor-pointer rounded-sm">Passport</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <FileSlot label="ID Front" file={idFront} onFile={setIdFront} inputRef={frontRef} required />
      {idType === "national_id" && <FileSlot label="ID Back" file={idBack} onFile={setIdBack} inputRef={backRef} />}
      <FileSlot label="Selfie / Photo with ID" file={selfie} onFile={setSelfie} inputRef={selfieRef} />
      <p className="text-[11px] text-muted-foreground">Accepted: JPG, PNG, WebP, PDF — max 10 MB each.</p>
      <Button className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5 w-fit" onClick={submit} disabled={saving}>
        {saving && <Loader2 className="size-3 animate-spin" />} Submit Documents
      </Button>
    </div>
  );
}

// Step 3: KYC Review (landlord action)
function KycReviewPanel({ tenantId, kyc, onDone }: { tenantId: string; kyc: Tenant["kyc"]; onDone: () => void }) {
  const [decision,  setDecision]  = useState<"approve" | "reject" | "">("");
  const [reason,    setReason]    = useState("");
  const [saving,    setSaving]    = useState(false);

  async function submit() {
    if (!decision) { toast.error("Select approve or reject"); return; }
    if (decision === "reject" && !reason.trim()) { toast.error("Rejection reason required"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`/api/tenants/${tenantId}/kyc/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, rejectionReason: reason.trim() || undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      toast.success(json.message);
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed."); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-2">
        <p className="text-xs font-medium">Submitted documents</p>
        <div className="flex flex-wrap gap-2">
          {(["id_front", "id_back", "selfie"] as const).map((doc) => (
            <a key={doc} href={`/api/tenants/${tenantId}/kyc?doc=${doc}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#2D64C8] hover:underline">
              <FileText className="size-3" /> {doc.replace("_", " ")}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Type: <span className="font-medium">{kyc?.idType === "national_id" ? "Kenya National ID" : "Passport"}</span> · Submitted: <span className="font-medium">{fmtDate(kyc?.submittedAt)}</span></p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setDecision("approve")} className={`flex-1 text-xs py-2 rounded-md border transition-colors cursor-pointer ${decision === "approve" ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-muted-foreground hover:border-emerald-400"}`}>
          <ShieldCheck className="size-3.5 inline mr-1" /> Approve
        </button>
        <button onClick={() => setDecision("reject")} className={`flex-1 text-xs py-2 rounded-md border transition-colors cursor-pointer ${decision === "reject" ? "bg-red-600 text-white border-red-600" : "border-border text-muted-foreground hover:border-red-400"}`}>
          <ShieldX className="size-3.5 inline mr-1" /> Reject
        </button>
      </div>
      {decision === "reject" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Rejection Reason <span className="text-red-500">*</span></Label>
          <textarea className="w-full rounded-md border border-input px-3 py-2 text-xs focus-visible:outline-none resize-none min-h-[64px]" placeholder="Explain why the documents were rejected…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      {decision && (
        <Button className={`h-8 text-xs gap-1.5 w-fit ${decision === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`} onClick={submit} disabled={saving}>
          {saving && <Loader2 className="size-3 animate-spin" />}
          Confirm {decision === "approve" ? "Approval" : "Rejection"}
        </Button>
      )}
    </div>
  );
}

// Step 4: Lease Agreement
function LeasePanel({ tenantId, propertySlug, onDone }: { tenantId: string; propertySlug: string; onDone: () => void }) {
  const [units,   setUnits]   = useState<UnitRef[]>([]);
  const [form,    setForm]    = useState({ unitId: "", startDate: "", endDate: "", rentAmount: "", depositAmount: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [saving,  setSaving]  = useState(false);
  const docRef = useRef<HTMLInputElement>(null);
  const f = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch(`/api/properties/${propertySlug}/units`).then((r) => r.json()).then((j) => setUnits(j.data ?? [])).catch(() => {});
  }, [propertySlug]);

  async function submit() {
    if (!form.unitId)      { toast.error("Unit is required"); return; }
    if (!form.startDate)   { toast.error("Start date is required"); return; }
    if (!form.endDate)     { toast.error("End date is required"); return; }
    if (!form.rentAmount)  { toast.error("Rent amount is required"); return; }
    if (!form.depositAmount) { toast.error("Deposit amount is required"); return; }
    setSaving(true);
    try {
      let res: Response;
      if (docFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k,v]) => fd.append(k,v));
        fd.append("signedDocument", docFile);
        res = await fetch(`/api/tenants/${tenantId}/lease`, { method: "POST", body: fd });
      } else {
        res = await fetch(`/api/tenants/${tenantId}/lease`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, rentAmount: Number(form.rentAmount), depositAmount: Number(form.depositAmount) }) });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      toast.success("Lease signed — awaiting move-in payment.");
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed."); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">Unit <span className="text-red-500">*</span></Label>
        <Select value={form.unitId} onValueChange={f("unitId")}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select unit" /></SelectTrigger>
          <SelectContent className="p-1 rounded-md">
            {units.map((u) => (
              <SelectItem key={u._id} value={u._id} className="text-xs cursor-pointer rounded-sm">
                Unit {u.unitNumber}
                <span className={`ml-2 text-[10px] ${u.occupancyStatus === "OCCUPIED" ? "text-amber-600" : "text-emerald-600"}`}>{u.occupancyStatus === "OCCUPIED" ? "Occupied" : "Vacant"}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Lease Start <span className="text-red-500">*</span></Label><Input type="date" className="h-8 text-xs" value={form.startDate} onChange={(e) => f("startDate")(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Lease End <span className="text-red-500">*</span></Label><Input type="date" className="h-8 text-xs" value={form.endDate} onChange={(e) => f("endDate")(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Monthly Rent (KES) <span className="text-red-500">*</span></Label><Input type="number" min={0} className="h-8 text-xs" value={form.rentAmount} onChange={(e) => f("rentAmount")(e.target.value)} placeholder="e.g. 25000" /></div>
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Deposit (KES) <span className="text-red-500">*</span></Label><Input type="number" min={0} className="h-8 text-xs" value={form.depositAmount} onChange={(e) => f("depositAmount")(e.target.value)} placeholder="e.g. 50000" /></div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium">Signed Lease Document <span className="text-muted-foreground font-normal">(optional · PDF)</span></Label>
        {docFile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <FileText className="size-3.5 text-[#2D64C8] shrink-0" /><span className="text-xs flex-1 truncate">{docFile.name}</span>
            <button onClick={() => setDocFile(null)} className="text-muted-foreground hover:text-red-500"><X className="size-3" /></button>
          </div>
        ) : (
          <button onClick={() => docRef.current?.click()} className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-dashed border-border text-muted-foreground hover:border-[#2D64C8]/60 hover:text-[#2D64C8] transition-colors w-fit">
            <Upload className="size-3" /> Upload signed copy
          </button>
        )}
        <input ref={docRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDocFile(f); e.target.value = ""; }} />
      </div>
      <Button className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5 w-fit" onClick={submit} disabled={saving}>
        {saving && <Loader2 className="size-3 animate-spin" />}<FileSignature className="size-3.5" /> Confirm Lease Signed
      </Button>
    </div>
  );
}

// Step 5: Move-in Payment
function PaymentPanel({ tenantId, leaseRecord, existing, onDone }: { tenantId: string; leaseRecord: Tenant["leaseRecord"]; existing: Tenant["moveInPayment"]; onDone: () => void }) {
  const [form, setForm] = useState({
    depositReceived:   String(existing?.depositReceived   ?? leaseRecord?.depositAmount  ?? ""),
    depositReference:  existing?.depositReference  ?? "",
    firstRentReceived: String(existing?.firstRentReceived ?? leaseRecord?.rentAmount     ?? ""),
    firstRentReference:existing?.firstRentReference ?? "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    setSaving(true);
    try {
      const res  = await fetch(`/api/tenants/${tenantId}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ depositReceived: Number(form.depositReceived), depositReference: form.depositReference || undefined, firstRentReceived: Number(form.firstRentReceived), firstRentReference: form.firstRentReference || undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      toast.success(json.message);
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed."); }
    finally { setSaving(false); }
  }

  const depExpected  = leaseRecord?.depositAmount ?? 0;
  const rentExpected = leaseRecord?.rentAmount    ?? 0;

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="rounded-md bg-muted/30 border border-border p-3 flex flex-col gap-1">
        <p className="text-xs font-medium">Expected move-in payments</p>
        <p className="text-[11px] text-muted-foreground">Deposit: <span className="font-medium text-foreground">{fmtKES(depExpected)}</span> · First month rent: <span className="font-medium text-foreground">{fmtKES(rentExpected)}</span></p>
        <p className="text-[11px] text-muted-foreground font-semibold">Total: {fmtKES(depExpected + rentExpected)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Deposit Received (KES)</Label><Input type="number" min={0} className="h-8 text-xs" value={form.depositReceived} onChange={(e) => f("depositReceived")(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Deposit Reference</Label><Input className="h-8 text-xs" value={form.depositReference} onChange={(e) => f("depositReference")(e.target.value)} placeholder="e.g. M-Pesa ref" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">First Rent Received (KES)</Label><Input type="number" min={0} className="h-8 text-xs" value={form.firstRentReceived} onChange={(e) => f("firstRentReceived")(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Rent Reference</Label><Input className="h-8 text-xs" value={form.firstRentReference} onChange={(e) => f("firstRentReference")(e.target.value)} placeholder="e.g. M-Pesa ref" /></div>
      </div>

      <Button className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5 w-fit" onClick={submit} disabled={saving}>
        {saving && <Loader2 className="size-3 animate-spin" />}<Banknote className="size-3.5" /> Confirm Payment Received
      </Button>
    </div>
  );
}

// ─── Onboarding stepper ───────────────────────────────────────────────────────

function OnboardingChecklist({ tenant, onRefresh }: { tenant: Tenant; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const status = tenant.onboardingStatus;

  function toggle(i: number) { setExpanded((p) => p === i ? null : i); }
  function done() { setExpanded(null); onRefresh(); }

  const steps = [
    {
      title:    "Basic Information",
      subtitle: "Name, phone, national ID and emergency contact",
      icon:     User,
      state:    "done" as StepState,
      body:     null,
    },
    {
      title:    "KYC Documents",
      subtitle: status === "KYC_REJECTED"
        ? `Rejected: ${tenant.kyc?.rejectionReason ?? "see reason above"}`
        : status === "DOCUMENTS_SUBMITTED" || stageIndex(status) > stageIndex("DOCUMENTS_SUBMITTED")
          ? `Submitted ${fmtDate(tenant.kyc?.submittedAt)}`
          : "Upload national ID or passport + selfie",
      icon:     CreditCard,
      state:    (status === "KYC_REJECTED" ? "rejected"
        : stageIndex(status) > STAGE_ORDER.indexOf("DOCUMENTS_SUBMITTED") ? "done"
        : status === "DOCUMENTS_SUBMITTED" ? "active"
        : stageIndex(status) >= STAGE_ORDER.indexOf("DOCUMENTS_SUBMITTED") ? "active" : "locked") as StepState,
      body: (status === "PENDING" || status === "KYC_REJECTED")
        ? <KycUploadPanel tenantId={tenant._id} onDone={done} />
        : null,
    },
    {
      title:    "KYC Review",
      subtitle: status === "KYC_APPROVED"
        ? `Approved ${fmtDate(tenant.kyc?.reviewedAt)}`
        : status === "KYC_REJECTED"
          ? `Rejected — waiting for re-submission`
          : status === "DOCUMENTS_SUBMITTED"
            ? "Review the submitted documents"
            : "Verify tenant identity",
      icon:     ShieldCheck,
      state:    (status === "KYC_APPROVED" || stageIndex(status) > STAGE_ORDER.indexOf("KYC_APPROVED") ? "done"
        : status === "DOCUMENTS_SUBMITTED" ? "active"
        : status === "KYC_REJECTED" ? "rejected"
        : "locked") as StepState,
      body: status === "DOCUMENTS_SUBMITTED"
        ? <KycReviewPanel tenantId={tenant._id} kyc={tenant.kyc} onDone={done} />
        : null,
    },
    {
      title:    "Lease Agreement",
      subtitle: tenant.leaseRecord
        ? `Signed ${fmtDate(tenant.leaseRecord.signedAt)} · Unit ${tenant.unitId?.unitNumber ?? "—"} · ${fmtKES(tenant.leaseRecord.rentAmount)}/mo`
        : "Set terms and confirm the lease is signed",
      icon:     FileSignature,
      state:    (stageIndex(status) > STAGE_ORDER.indexOf("LEASE_SIGNED") ? "done"
        : status === "LEASE_SIGNED" ? "done"
        : status === "KYC_APPROVED" ? "active"
        : "locked") as StepState,
      body: status === "KYC_APPROVED"
        ? <LeasePanel tenantId={tenant._id} propertySlug={tenant.property.slug} onDone={done} />
        : null,
    },
    {
      title:    "Move-in Payment",
      subtitle: status === "ACTIVE"
        ? `Deposit ${fmtKES(tenant.moveInPayment?.depositReceived)} + Rent ${fmtKES(tenant.moveInPayment?.firstRentReceived)} received`
        : "Confirm deposit and first month's rent received",
      icon:     Banknote,
      state:    (status === "ACTIVE" ? "done"
        : status === "LEASE_SIGNED" ? "active"
        : "locked") as StepState,
      body: status === "LEASE_SIGNED"
        ? <PaymentPanel tenantId={tenant._id} leaseRecord={tenant.leaseRecord} existing={tenant.moveInPayment} onDone={done} />
        : null,
    },
  ];

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b">
        <h3 className="text-xs font-semibold text-foreground">Onboarding Checklist</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Complete each step to fully onboard the tenant.</p>
      </div>
      <div className="divide-y">
        {steps.map((step, i) => {
          const Icon     = step.icon;
          const isOpen   = expanded === i;
          const hasAction= !!step.body;
          const isActive = step.state === "active" || step.state === "rejected";

          return (
            <div key={i} className={`transition-colors ${isActive ? "bg-[#2D64C8]/[0.02]" : ""}`}>
              <button
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${hasAction ? "cursor-pointer hover:bg-muted/20" : "cursor-default"}`}
                onClick={() => hasAction && toggle(i)}
                disabled={!hasAction}
              >
                <StepIcon state={step.state} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${step.state === "locked" ? "text-muted-foreground/50" : "text-foreground"}`}>
                    {step.title}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${step.state === "rejected" ? "text-red-600" : "text-muted-foreground"}`}>
                    {step.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isActive && !isOpen && (
                    <span className="text-[10px] font-medium text-[#2D64C8] bg-[#2D64C8]/10 px-2 py-0.5 rounded-full">
                      {step.state === "rejected" ? "Re-submit" : "Action required"}
                    </span>
                  )}
                  {hasAction && (isOpen ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />)}
                </div>
              </button>
              {isOpen && step.body && (
                <div className="px-4 pb-4 border-t bg-muted/20">
                  {step.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [tenant,    setTenant]    = useState<Tenant | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [editOpen,  setEditOpen]  = useState(false);
  const [deacting,  setDeacting]  = useState(false);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/tenants/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      const json = await res.json();
      setTenant(json.data);
    } catch { toast.error("Failed to load tenant."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function deactivate() {
    if (!tenant) return;
    setDeacting(true);
    try {
      const res  = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      setTenant((t) => t ? { ...t, onboardingStatus: "INACTIVE" } : t);
      toast.success("Tenant deactivated.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed."); }
    finally { setDeacting(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-full bg-[#F0F4F8]">
      <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
    </div>
  );

  if (notFound || !tenant) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-[#F0F4F8] gap-3 p-8">
      <User className="size-8 text-muted-foreground/30" />
      <p className="text-sm font-medium">Tenant not found</p>
      <Button variant="outline" className="h-8 text-xs gap-1.5" onClick={() => router.back()}>
        <ArrowLeft className="size-3.5" /> Go back
      </Button>
    </div>
  );

  const isActive   = tenant.onboardingStatus === "ACTIVE";
  const isInactive = tenant.onboardingStatus === "INACTIVE";

  return (
    <>
      <EditSheet open={editOpen} onClose={() => setEditOpen(false)} tenant={tenant} onSaved={setTenant} />

      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="icon" className="size-8 shrink-0 cursor-pointer"
              onClick={() => router.push(`/properties/${tenant.property.slug}?tab=tenants`)}>
              <ArrowLeft className="size-3.5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold truncate">{tenant.fullName}</h1>
                <StatusBadge status={tenant.onboardingStatus} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{tenant.property.propertyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" className="h-8 text-xs gap-1.5 cursor-pointer" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            {!isInactive && (
              <Button variant="outline" className="h-8 text-xs gap-1.5 cursor-pointer text-red-600 border-red-200 hover:bg-red-50"
                onClick={deactivate} disabled={deacting}>
                {deacting ? <Loader2 className="size-3.5 animate-spin" /> : <UserX className="size-3.5" />}
                Deactivate
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Active banner */}
          {isActive && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 font-medium">Tenant fully onboarded and active in Unit {tenant.unitId?.unitNumber ?? "—"}.</p>
            </div>
          )}

          {/* Inactive banner */}
          {isInactive && (
            <div className="rounded-lg border border-border bg-muted px-4 py-3 flex items-center gap-2">
              <UserX className="size-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">This tenant has been deactivated.</p>
            </div>
          )}

          {/* Onboarding checklist */}
          {!isInactive && <OnboardingChecklist tenant={tenant} onRefresh={load} />}

          {/* Personal info card */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              {[
                [User,       "Full Name",         tenant.fullName],
                [Phone,      "Phone",              tenant.phone],
                [Mail,       "Email",              tenant.email       ?? "—"],
                [CreditCard, "National ID",        tenant.nationalId],
                [Phone,      "Emergency Name",     tenant.emergencyContactName  ?? "—"],
                [Phone,      "Emergency Phone",    tenant.emergencyContactPhone ?? "—"],
              ].map(([Icon, label, value], i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="size-3 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{label as string}</p>
                    <p className="text-xs font-medium">{value as string}</p>
                  </div>
                </div>
              ))}
            </div>
            {tenant.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-[11px] text-muted-foreground mb-1">Notes</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{tenant.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
