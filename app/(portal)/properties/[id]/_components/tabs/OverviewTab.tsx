"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  MapPin,
  Camera,
  Plus,
  Trash2,
  Phone,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import toast from "react-hot-toast";
import { StatCard, SectionHeader, FieldLabel } from "../../_ui";
import type { Contact, Property, Unit } from "../../_types";
import Image from "next/image";

type Props = {
  property: Property;
  units: Unit[];
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  slug: string;
  onPropertyUpdate: (updated: Property) => void;
};

export function OverviewTab({
  property,
  units,
  contacts,
  setContacts,
  slug,
  onPropertyUpdate,
}: Props) {
  const [managers, setManagers] = useState<
    { _id: string; fullName: string; email: string }[]
  >([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [propertyManagerId, setPropertyManagerId] = useState(
    property.propertyManager?._id ?? "",
  );
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    role: "",
    name: "",
    phone: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    fetchManagers();
  }, []);

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
  const occupiedCount = units.filter(
    (u) => u.occupancyStatus === "OCCUPIED",
  ).length;
  const vacantCount = units.filter(
    (u) => u.occupancyStatus === "VACANT",
  ).length;
  const totalUnits = property.unitTypes.reduce((sum, u) => sum + u.count, 0);
  const hasCoords = !!property.location.coordinates;
  const locationLine = [
    property.location.city,
    property.location.county,
    property.location.country,
  ]
    .filter(Boolean)
    .join(", ");

  async function handleManagerChange(managerId: string | null) {
    const res = await fetch(`/api/properties/${slug}/manager`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });
    if (!res.ok) {
      toast.error("Failed to assign manager");
      return;
    }
    toast.success(managerId ? "Manager assigned" : "Manager removed");
  }

  async function handleCoverPhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      const res = await fetch(`/api/properties/${slug}`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Unknown error");
      }
      const { coverPhotoUrl } = await res.json();
      onPropertyUpdate({ ...property, coverPhotoUrl });
      toast.success("Cover photo updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update cover photo.",
      );
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAddContact() {
    if (!newContact.role.trim() || !newContact.name.trim()) return;
    try {
      const res = await fetch(`/api/properties/${slug}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      if (!res.ok) throw new Error();
      const added = await res.json();
      setContacts((prev) => [...prev, added]);
      setAddingContact(false);
      setNewContact({ role: "", name: "", phone: "" });
      toast.success("Contact added.");
    } catch {
      toast.error("Failed to add contact.");
    }
  }

  async function handleDeleteContact(cid: string) {
    try {
      const res = await fetch(`/api/properties/${slug}/contacts/${cid}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setContacts((prev) => prev.filter((c) => c._id !== cid));
      toast.success("Contact removed.");
    } catch {
      toast.error("Failed to remove contact.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Unit Types"
          value={String(property.unitTypes.length)}
          sub={`${totalUnits} total unit${totalUnits !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Total Tenants"
          value={units.length > 0 ? String(occupiedCount) : "—"}
          sub={
            units.length > 0
              ? `Active lease${occupiedCount !== 1 ? "s" : ""}`
              : "No leases yet"
          }
        />
        <StatCard
          label="Occupied"
          value={units.length > 0 ? String(occupiedCount) : "—"}
          sub={
            units.length > 0
              ? `${Math.round((occupiedCount / units.length) * 100)}%`
              : "No units yet"
          }
        />
        <StatCard
          label="Vacant"
          value={units.length > 0 ? String(vacantCount) : "—"}
          sub={
            vacantCount > 0
              ? "Available now"
              : units.length > 0
                ? "Fully occupied"
                : "No units yet"
          }
        />
      </div>

      {/* Row 1: Property Details + Location */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Property Details */}
        <div className="bg-white rounded-lg border p-4 flex flex-col gap-4 justify-between">
          <SectionHeader title="Property Details" />
          <div className="flex flex-col gap-0.5 ">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Property Name
            </span>
            <span className="text-xs font-semibold text-foreground">
              {property.propertyName}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </span>
            {property.description ? (
              <p className="text-xs text-foreground leading-relaxed">
                {property.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">
                No description provided.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 pt-2 ">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Cover Photo
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverPhotoChange}
            />
            <div
              className="relative h-52 rounded-md overflow-hidden border cursor-pointer group bg-muted/20"
              onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
            >
              {property.coverPhotoUrl ? (
                <Image
                  src={property.coverPhotoUrl}
                  alt={property.propertyName}
                  className="w-full h-full object-cover"
                  fill
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Building2 className="size-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    No cover photo
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Click to upload
                  </p>
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
            <p className="text-[11px] text-muted-foreground/70">
              JPG, PNG or WebP · max 5 MB
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
          <SectionHeader title="Location" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Physical Address
            </span>
            <p className="text-xs font-semibold text-foreground">
              {property.location.physicalAddress}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {locationLine}
            </p>
          </div>
          <div className="grid grid-cols-3">
            {[
              { label: "City", value: property.location.city },
              { label: "County", value: property.location.county },
              { label: "Country", value: property.location.country },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-xs text-foreground">{value || "—"}</span>
              </div>
            ))}
          </div>
          {hasCoords ? (
            <div className="flex flex-col gap-2 flex-1 justify-end">
              <APIProvider
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
              >
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Map
                </span>
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
              <p className="text-xs text-muted-foreground font-medium">
                No coordinates set.
              </p>
              <p className="text-[11px] text-muted-foreground/70 text-center max-w-45">
                Use the Edit sheet to pin this property on the map.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Contacts */}
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

          {/* Property Manager */}
          <div className="mb-4 pb-4 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User className="size-3 shrink-0" /> Property Manager
              </span>
              <p className="text-[11px] text-muted-foreground/70">
                Receives rent alerts and tenant communications on behalf of this
                property.
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-56">
              <Select
                value={propertyManagerId}
                onValueChange={(v) => {
                  if (v === "__remove__") {
                    setPropertyManagerId("");
                    handleManagerChange(null);
                    return;
                  }
                  setPropertyManagerId(v);
                  handleManagerChange(v);
                }}
              >
                <SelectTrigger className="h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 w-full">
                  <SelectValue placeholder={managersLoading? "Loading..." : "Not assigned"} />

                </SelectTrigger>
                <SelectContent className="p-1">
                  {managers.map((m) => (
                    <SelectItem
                      key={m._id}
                      value={m._id}
                      className="text-xs cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{m.fullName}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {m.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {propertyManagerId && (
                    <SelectItem
                      value="__remove__"
                      className="text-xs text-destructive font-medium cursor-pointer"
                    >
                      Remove manager
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Add contact form */}
          {addingContact && (
            <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2 mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                New Contact
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Role</FieldLabel>
                  <Input
                    className="h-7 text-xs"
                    placeholder="e.g. Caretaker"
                    value={newContact.role}
                    onChange={(e) =>
                      setNewContact({ ...newContact, role: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Full Name</FieldLabel>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Full name"
                    value={newContact.name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, name: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Phone</FieldLabel>
                  <Input
                    className="h-7 text-xs"
                    placeholder="+254…"
                    value={newContact.phone}
                    onChange={(e) =>
                      setNewContact({ ...newContact, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <Button
                  variant="ghost"
                  className="h-7 text-xs px-2 cursor-pointer"
                  onClick={() => {
                    setAddingContact(false);
                    setNewContact({ role: "", name: "", phone: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="h-7 text-xs px-3 cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
                  disabled={!newContact.role.trim() || !newContact.name.trim()}
                  onClick={handleAddContact}
                >
                  Save Contact
                </Button>
              </div>
            </div>
          )}

          {/* Contact list */}
          {contacts.length === 0 && !addingContact ? (
            <div className="flex flex-col items-center justify-center py-10 gap-1.5">
              <Phone className="size-5 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">
                No contacts added yet.
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                Add caretakers, security, or other on-site contacts.
              </p>
            </div>
          ) : contacts.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table style={{ tableLayout: "fixed", width: "100%" }}>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-muted-foreground tracking-wide w-[30%]">
                      Role
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground tracking-wide w-[25%]">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground tracking-wide w-[35%]">
                      Phone
                    </TableHead>
                    <TableHead className="w-[10%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow
                      key={c._id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="text-xs font-medium">
                        {c.role}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-[#2D64C8] hover:underline flex items-center gap-1 w-fit"
                          >
                            <Phone className="size-3" />
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => handleDeleteContact(c._id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
