"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ExternalLink, Loader2, User, X, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { StatCard } from "../../_ui";
import type { Tenant, OnboardingStatus } from "../../_types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  slug: string;
  onTenantCountChange: (n: number) => void;
};

// ─── Onboarding status helpers ────────────────────────────────────────────────

const STATUS_LABEL: Record<OnboardingStatus, string> = {
  PENDING:             "Pending",
  DOCUMENTS_SUBMITTED: "Docs Submitted",
  KYC_APPROVED:        "KYC Approved",
  KYC_REJECTED:        "KYC Rejected",
  LEASE_SIGNED:        "Lease Signed",
  ACTIVE:              "Active",
  INACTIVE:            "Inactive",
};

const STATUS_STYLE: Record<OnboardingStatus, string> = {
  PENDING:             "bg-muted text-muted-foreground",
  DOCUMENTS_SUBMITTED: "bg-blue-50 text-blue-700",
  KYC_APPROVED:        "bg-sky-50 text-sky-700",
  KYC_REJECTED:        "bg-red-50 text-red-700",
  LEASE_SIGNED:        "bg-violet-50 text-violet-700",
  ACTIVE:              "bg-emerald-50 text-emerald-700",
  INACTIVE:            "bg-muted text-muted-foreground",
};

function OnboardingBadge({ status }: { status: OnboardingStatus }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Add Tenant sheet ─────────────────────────────────────────────────────────

type AddForm = { fullName: string; phone: string; nationalId: string; email: string; emergencyContactName: string; emergencyContactPhone: string; notes: string };
const EMPTY: AddForm = { fullName: "", phone: "", nationalId: "", email: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" };

function AddTenantSheet({
  open, onClose, slug, onCreated,
}: {
  open: boolean; onClose: () => void; slug: string; onCreated: (t: Tenant) => void;
}) {
  const [form, setForm]     = useState<AddForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<AddForm>>({});

  useEffect(() => { if (open) { setForm(EMPTY); setErrors({}); } }, [open]);

  const f = (k: keyof AddForm) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  async function submit() {
    const e: Partial<AddForm> = {};
    if (!form.fullName.trim())   e.fullName   = "Required";
    if (!form.phone.trim())      e.phone      = "Required";
    if (!form.nationalId.trim()) e.nationalId = "Required";
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const res  = await fetch(`/api/properties/${slug}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName:              form.fullName.trim(),
          phone:                 form.phone.trim(),
          nationalId:            form.nationalId.trim(),
          email:                 form.email.trim()                || undefined,
          emergencyContactName:  form.emergencyContactName.trim() || undefined,
          emergencyContactPhone: form.emergencyContactPhone.trim()|| undefined,
          notes:                 form.notes.trim()                || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      onCreated(json.data);
      toast.success("Tenant created — complete onboarding on the next page.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tenant.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-sm font-semibold">New Tenant</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Basic info — full onboarding happens on the next page.</p>
          </div>
          <button onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Required */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Identity</p>
          {([ ["fullName","Full Name",true,"e.g. Jane Wanjiru"], ["phone","Phone",true,"+254 7XX XXX XXX"], ["nationalId","National ID / Passport",true,"ID number"] ] as [keyof AddForm, string, boolean, string][]).map(([k,lbl,req,ph]) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">{lbl}{req && <span className="text-red-500 ml-0.5">*</span>}</Label>
              <Input className="h-8 text-xs" value={form[k]} onChange={(e) => f(k)(e.target.value)} placeholder={ph} />
              {errors[k] && <p className="text-xs text-red-500">{errors[k]}</p>}
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Email</Label>
            <Input type="email" className="h-8 text-xs" value={form.email} onChange={(e) => f("email")(e.target.value)} placeholder="optional" />
          </div>

          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">Emergency Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input className="h-8 text-xs" value={form.emergencyContactName} onChange={(e) => f("emergencyContactName")(e.target.value)} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input className="h-8 text-xs" value={form.emergencyContactPhone} onChange={(e) => f("emergencyContactPhone")(e.target.value)} placeholder="+254 7XX" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-0 resize-none min-h-[60px]" value={form.notes} onChange={(e) => f("notes")(e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>

        <div className="border-t px-4 py-3 flex justify-end gap-2">
          <Button variant="outline" className="h-8 text-xs" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90 gap-1.5" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-3 animate-spin" />}
            Create & Start Onboarding
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type FilterKey = "all" | "onboarding" | "ACTIVE" | "INACTIVE";

export function TenantsTab({ slug, onTenantCountChange }: Props) {
  const router = useRouter();

  const [tenants,     setTenants]     = useState<Tenant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [addOpen,     setAddOpen]     = useState(false);
  const [filter,      setFilter]      = useState<FilterKey>("all");
  const [deactivating,setDeactivating]= useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/properties/${slug}/tenants`);
      const json = await res.json();
      if (res.ok) setTenants(json.data ?? []);
    } catch {
      toast.error("Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    onTenantCountChange(tenants.filter((t) => t.onboardingStatus === "ACTIVE").length);
  }, [tenants, onTenantCountChange]);

  function onCreated(t: Tenant) {
    setTenants((p) => [t, ...p]);
    router.push(`/tenants/${t._id}`);
  }

  async function deactivate(t: Tenant) {
    setDeactivating(t._id);
    try {
      const res  = await fetch(`/api/tenants/${t._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      setTenants((p) => p.map((x) => x._id === t._id ? { ...x, onboardingStatus: "INACTIVE" as OnboardingStatus } : x));
      toast.success("Tenant deactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setDeactivating(null);
    }
  }

  const ONBOARDING_STATUSES: OnboardingStatus[] = ["PENDING","DOCUMENTS_SUBMITTED","KYC_APPROVED","KYC_REJECTED","LEASE_SIGNED"];

  const filtered = tenants.filter((t) => {
    if (filter === "all")        return true;
    if (filter === "onboarding") return ONBOARDING_STATUSES.includes(t.onboardingStatus);
    return t.onboardingStatus === filter;
  });

  const activeCount      = tenants.filter((t) => t.onboardingStatus === "ACTIVE").length;
  const onboardingCount  = tenants.filter((t) => ONBOARDING_STATUSES.includes(t.onboardingStatus)).length;
  const inactiveCount    = tenants.filter((t) => t.onboardingStatus === "INACTIVE").length;

  return (
    <>
      <AddTenantSheet open={addOpen} onClose={() => setAddOpen(false)} slug={slug} onCreated={onCreated} />

      <div className="flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Active Tenants"   value={String(activeCount)} />
          <StatCard label="In Onboarding"    value={String(onboardingCount)} />
          <StatCard label="Inactive"         value={String(inactiveCount)} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ["all",        "All"],
              ["onboarding", "In Onboarding"],
              ["ACTIVE",     "Active"],
              ["INACTIVE",   "Inactive"],
            ] as [FilterKey, string][]).map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  filter === k
                    ? "bg-[#2D64C8] text-white border-[#2D64C8]"
                    : "bg-white text-muted-foreground border-border hover:border-[#2D64C8]/50"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <Button
            className="h-8 text-xs gap-1.5 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer shrink-0"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-3.5" /> Add Tenant
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <User className="size-6 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {tenants.length === 0 ? "No tenants yet." : "No tenants match this filter."}
              </p>
              {tenants.length === 0 && (
                <Button variant="outline" className="h-7 text-xs gap-1 mt-1 cursor-pointer" onClick={() => setAddOpen(true)}>
                  <Plus className="size-3" /> Add Tenant
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Unit</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((t) => {
                    const busy = deactivating === t._id;
                    return (
                      <tr key={t._id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/tenants/${t._id}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{t.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.unitId ? `Unit ${t.unitId.unitNumber}` : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3"><OnboardingBadge status={t.onboardingStatus} /></td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="View / Continue Onboarding"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-[#2D64C8] hover:bg-[#2D64C8]/10 transition-colors cursor-pointer"
                              onClick={() => router.push(`/tenants/${t._id}`)}
                            >
                              <ExternalLink className="size-3.5" />
                            </button>
                            {t.onboardingStatus !== "INACTIVE" && (
                              <button
                                title="Deactivate"
                                disabled={busy}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                                onClick={() => deactivate(t)}
                              >
                                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <UserX className="size-3.5" />}
                              </button>
                            )}
                          </div>
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
    </>
  );
}
