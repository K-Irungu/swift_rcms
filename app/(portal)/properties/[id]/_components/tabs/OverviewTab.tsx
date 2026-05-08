"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, Camera, Plus, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import toast from "react-hot-toast";
import { SectionHeader } from "../../_ui";
import { ConfirmPasswordDialog } from "../ConfirmPasswordDialog";
import Image from "next/image";
import { PendingInvite, OverviewTabProps, NewContact } from "../../_types";
import { AddContactForm } from "../AddContactForm";
import { ContactsList } from "../ContactsList";
import { PendingInviteBanner } from "../PendingInviteBanner";
import { Stats } from "../Stats";

export function OverviewTab({
  property,
  units,
  contacts,
  setContacts,
  slug,
  onPropertyUpdate,
}: OverviewTabProps) {

  // ─── State ──────────────────────────────────────────────────────────────────

  const [managers, setManagers] = useState<{ _id: string; fullName: string; email: string }[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [propertyManagerId, setPropertyManagerId] = useState(property.propertyManager?._id ?? "");
  const [pendingManagerId, setPendingManagerId] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const occupiedCount = units.filter((u) => u.occupancyStatus === "OCCUPIED").length;
  const vacantCount   = units.filter((u) => u.occupancyStatus === "VACANT").length;
  const totalUnits    = property.unitTypes.reduce((sum, u) => sum + u.count, 0);
  const hasCoords     = !!property.location.coordinates;
  const locationLine  = [property.location.city, property.location.county, property.location.country]
    .filter(Boolean)
    .join(", ");

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Effect 1 — Initial data load
  useEffect(() => {
    fetchManagers();
    fetchPendingInvite();
  }, []);

  // Effect 2 — SSE invite stream: opens when invite is pending, closes on resolution
  useEffect(() => {
    if (!pendingInvite) return;

    const es = new EventSource(`/api/properties/${slug}/manager/invite/stream`);

    es.addEventListener("manager-assigned", (e: MessageEvent) => {
      const { managerId, managerName } = JSON.parse(e.data);
      es.close();
      fetchManagers();
      setPropertyManagerId(managerId);
      setPendingInvite(null);
      toast.success(`${managerName} has accepted the invitation`);
    });

    es.addEventListener("invite-expired", () => {
      es.close();
      setPendingInvite(null);
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) es.close();
    };

    return () => es.close();
  }, [pendingInvite]);

  // ─── Data fetchers ──────────────────────────────────────────────────────────

  async function fetchManagers() {
    setManagersLoading(true);
    try {
      const res = await fetch("/api/users?role=PROPERTY_MANAGER");
      const data = await res.json();
      setManagers(data);
    } catch {
      toast.error("Failed to load managers");
    } finally {
      setManagersLoading(false);
    }
  }

  async function fetchPendingInvite() {
    try {
      const res = await fetch(`/api/properties/${slug}/manager/invite`);
      const data = await res.json();
      setPendingInvite(data.data ?? null);
    } catch {
      // non-critical — leave banner empty
    }
  }

  // ─── Manager handlers ───────────────────────────────────────────────────────

  async function handleManagerRemove() {
    const res = await fetch(`/api/properties/${slug}/manager`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: null }),
    });
    if (!res.ok) { toast.error("Failed to remove manager"); return; }
    setPropertyManagerId("");
    toast.success("Manager removed");
  }

  async function handleManagerInvite(managerId: string) {
    const res = await fetch(`/api/properties/${slug}/manager/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });
    const body = await res.json();
    if (!res.ok || body.success !== true) {
      toast.error(body.message || "Failed to send invite");
      throw new Error(body.message);
    }
    toast.success(body.message || "Invitation sent — awaiting manager's acceptance");
    return body.data as { token: string; expiresAt: string };
  }

  async function handleCancelInvite() {
    try {
      const res = await fetch(`/api/properties/${slug}/manager/invite`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to cancel invitation"); return; }
      setPendingInvite(null);
      toast.success("Invitation cancelled");
    } catch {
      toast.error("Failed to cancel invitation");
    }
  }

  async function handleInviteConfirmed() {
    if (!pendingManagerId) return;
    const invited = managers.find((m) => m._id === pendingManagerId);
    const result  = await handleManagerInvite(pendingManagerId);
    setPendingInvite({
      managerName:  invited?.fullName ?? "",
      managerEmail: invited?.email   ?? "",
      expiresAt:    result?.expiresAt ?? "",
    });
    setPendingManagerId(null);
  }

  // ─── Cover photo handler ────────────────────────────────────────────────────

  async function handleCoverPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("Image must be under 5 MB."); return; }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      const res = await fetch(`/api/properties/${slug}`, { method: "PATCH", body: formData });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Unknown error");
      }
      const { coverPhotoUrl } = await res.json();
      onPropertyUpdate({ ...property, coverPhotoUrl });
      toast.success("Cover photo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update cover photo.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ─── Contact handlers ───────────────────────────────────────────────────────

  async function handleAddContact(contact: NewContact) {
    const res = await fetch(`/api/properties/${slug}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    if (!res.ok) throw new Error();
    const added = await res.json();
    setContacts((prev) => [...prev, added]);
    toast.success(added.name ? `${added.name} added as a contact.` : "Contact added.");
  }

  async function handleDeleteContact(cid: string) {
    try {
      const res = await fetch(`/api/properties/${slug}/contacts/${cid}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContacts((prev) => prev.filter((c) => c._id !== cid));
      toast.success("Contact removed.");
    } catch {
      toast.error("Failed to remove contact.");
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* 1. Stats */}
      <Stats
        property={property}
        totalUnits={totalUnits}
        occupiedCount={occupiedCount}
        vacantCount={vacantCount}
        units={units}
      />

      {/* 2. Property Details + Location */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div className="bg-white rounded-lg border p-4 flex flex-col gap-4 justify-between">
          <SectionHeader title="Property Details" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Property Name
            </span>
            <span className="text-xs font-semibold text-foreground">{property.propertyName}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </span>
            {property.description ? (
              <p className="text-xs text-foreground leading-relaxed">{property.description}</p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No description provided.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Cover Photo
            </span>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPhotoChange} />
            <div
              className="relative h-52 rounded-md overflow-hidden border cursor-pointer group bg-muted/20"
              onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
            >
              {property.coverPhotoUrl ? (
                <Image src={property.coverPhotoUrl} alt={property.propertyName} className="w-full h-full object-cover" fill />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Building2 className="size-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No cover photo</p>
                  <p className="text-[11px] text-muted-foreground/70">Click to upload</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                {uploadingPhoto ? (
                  <Loader2 className="size-5 text-white animate-spin" />
                ) : (
                  <>
                    <Camera className="size-5 text-white" />
                    <p className="text-xs text-white font-medium">
                      {property.coverPhotoUrl ? "Change photo" : "Upload photo"}
                    </p>
                  </>
                )}
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20">
                  <div className="h-full bg-white animate-pulse" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/70">JPG, PNG or WebP · max 5 MB</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
          <SectionHeader title="Location" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Physical Address
            </span>
            <p className="text-xs font-semibold text-foreground">{property.location.physicalAddress}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{locationLine}</p>
          </div>
          <div className="grid grid-cols-3">
            {[
              { label: "City",    value: property.location.city    },
              { label: "County",  value: property.location.county  },
              { label: "Country", value: property.location.country },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                <span className="text-xs text-foreground">{value || "—"}</span>
              </div>
            ))}
          </div>
          {hasCoords ? (
            <div className="flex flex-col gap-2 flex-1 justify-end">
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Map</span>
                <div className="rounded-md overflow-hidden border h-52">
                  <Map
                    defaultCenter={property.location.coordinates!}
                    defaultZoom={15}
                    mapId="property-detail-map"
                    gestureHandling="none"
                    disableDefaultUI
                    zoomControl={false}
                  >
                    <AdvancedMarker position={property.location.coordinates!} />
                  </Map>
                </div>
              </APIProvider>
              <p className="text-[11px] font-mono text-muted-foreground/60">
                {property.location.coordinates!.lat.toFixed(5)}°N,&nbsp;
                {property.location.coordinates!.lng.toFixed(5)}°E
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed h-52 gap-2 bg-muted/20">
              <MapPin className="size-5 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">No coordinates set.</p>
              <p className="text-[11px] text-muted-foreground/70 text-center max-w-45">
                Use the Edit sheet to pin this property on the map.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Contacts */}
      <div className="bg-white rounded-lg border flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-4 min-w-0">
          <SectionHeader
            title="Contacts"
            action={
              !addingContact ? (
                <Button
                  variant="outline"
                  className="h-7 text-[11px] gap-1 px-2 cursor-pointer"
                  onClick={() => setAddingContact(true)}
                >
                  <Plus className="size-2.5" /> Add Contact
                </Button>
              ) : undefined
            }
          />

          <div className="mb-4 pb-4 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User className="size-3 shrink-0" /> Property Manager
              </span>
              <p className="text-[11px] text-muted-foreground/70">
                Receives rent alerts and tenant communications on behalf of this property.
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-56 flex flex-col gap-2">
              <Select
                value={propertyManagerId}
                disabled={!!pendingInvite}
                onOpenChange={(open) => { if (open) fetchManagers(); }}
                onValueChange={(v) => {
                  if (v === "__remove__") { handleManagerRemove(); return; }
                  setPendingManagerId(v);
                }}
              >
                <SelectTrigger className="h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 w-full disabled:opacity-60 disabled:cursor-not-allowed">
                  <SelectValue placeholder={managersLoading ? "Loading..." : "Not assigned"} />
                </SelectTrigger>
                <SelectContent className="p-1">
                  {managers.map((m) => (
                    <SelectItem key={m._id} value={m._id} className="text-xs cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium">{m.fullName}</span>
                        <span className="text-muted-foreground text-[11px]">{m.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {propertyManagerId && !pendingInvite && (
                    <SelectItem value="__remove__" className="text-xs text-destructive font-medium cursor-pointer">
                      Remove manager
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {pendingInvite && (
                <PendingInviteBanner pendingInvite={pendingInvite} onCancel={handleCancelInvite} />
              )}
            </div>
          </div>

          {addingContact && (
            <AddContactForm onSave={handleAddContact} onCancel={() => setAddingContact(false)} />
          )}

          <ContactsList contacts={contacts} isFormOpen={addingContact} onDelete={handleDeleteContact} />
        </div>
      </div>

      {/* 4. Dialogs */}
      <ConfirmPasswordDialog
        open={!!pendingManagerId}
        managerName={managers.find((m) => m._id === pendingManagerId)?.fullName ?? ""}
        onConfirmed={handleInviteConfirmed}
        onCancel={() => setPendingManagerId(null)}
      />

    </div>
  );
}
