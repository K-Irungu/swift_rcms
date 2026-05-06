"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
 import { useProperty } from "./_hooks/UseProperty";
 import { useGeocode } from "./_hooks/UseGeoCode";


import  { Contact, Draft, Property, Unit }  from "./_types";
import { PageSkeleton } from "./_ui";
import {
  ArrowLeft,
  MapPin,
  Building2,
  KeyRound,
  Edit2,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  Phone,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard } from "./_ui";
import { SectionHeader, FieldLabel } from "./_ui";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import toast from "react-hot-toast";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera } from "lucide-react";
import { types } from "util";
import EditSheet from "./_components/EditSheet";
import { COUNTRY_CODES, formatKES } from "./_lib";
import TabStrip from "./_components/TabStrip";





// ─── Main page ────────────────────────────────────────────────────────────────

export default function SinglePropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const {
  property,
  setProperty,
  units,
  contacts,
  setContacts,
  propertyManagerId,
  setPropertyManagerId,
  loading,
  notFound,
} = useProperty(id);



  const currentMonth = format(new Date(), "MMMM yyyy");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [managers, setManagers] = useState< { _id: string; fullName: string; email: string }[] >([]);

  const [activeTab, setActiveTab] = useState< "overview" | "units" | "financials" | "maintenance" >("overview");
  const [unitFilter, setUnitFilter] = useState<"all" | "vacant" | "occupied">( "all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newMethod, setNewMethod] = useState("");

const {
  geocoding,
  reverseGeocoding,
  formattedAddress,
  setFormattedAddress,
  runGeocode,
  reverseGeocode,
} = useGeocode(draft, sheetOpen, (coords) => {
  setDraft((prev) =>
    prev ? { ...prev, location: { ...prev.location, coordinates: coords } } : prev
  );
});



  // Overview tab local state

  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ role: "", name: "", phone: ""});


  // Load property manager users for assignment dropdown
  useEffect(() => {
    fetch("/api/users?role=PROPERTY_MANAGER")
      .then((r) => r.json())
      .then(setManagers)
      .catch(() => toast.error("Failed to load managers"));
  }, []);



 


  if (loading) return <PageSkeleton />;

  if (notFound || !property) {
    return (
      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full items-center justify-center gap-3 p-8">
        <Building2 className="size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">
          Property not found
        </p>
        <p className="text-xs text-muted-foreground">
          This property may have been removed.
        </p>
        <Button
          variant="outline"
          className="h-8 text-xs gap-1.5 mt-1 cursor-pointer"
          onClick={() => router.push("/properties/all-properties")}
        >
          <ArrowLeft className="size-3.5" /> Back to Properties
        </Button>
      </div>
    );
  }

async function handleManagerChange(managerId: string | null) {
  try {
    const res = await fetch(`/api/properties/${id}/manager`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });

    if (!res.ok) throw new Error();

    toast.success(managerId ? "Manager assigned" : "Manager removed");
  } catch {
    toast.error("Failed to assign manager");
  }
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
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Unknown error");
      }
      const { coverPhotoUrl } = await res.json();
      setProperty((prev) => (prev ? { ...prev, coverPhotoUrl } : prev));
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

function openSheet() {
  if (!property) return;

  const coords = property.location?.coordinates ?? null;

  setDraft({
    propertyName: property.propertyName,
    description: property.description ?? "",
    location: {
      physicalAddress: property.location.physicalAddress,
      country: property.location.country,
      county: property.location.county,
      city: property.location.city,
      coordinates: coords,
    },
    unitTypes: property.unitTypes.map((ut) => ({
      _id: ut._id,
      name: ut.name,
      count: ut.count,
      rentAmount: ut.rentAmount,
      depositAmount: ut.depositAmount ?? 0,
    })),
    billing: {
      rentDueDay: property.billing.rentDueDay,
      paymentMethods: [...property.billing.paymentMethods],
    },
  });

  setFormattedAddress(null);

  if (coords) {
    reverseGeocode(coords.lat, coords.lng);
  }

  setSheetOpen(true);
}
  function closeSheet() {
    if (saving) return;
    setSheetOpen(false);
    setDraft(null);
    setNewMethod("");
    setFormattedAddress(null);
  }

  async function saveEdit() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName: draft.propertyName,
          description: draft.description,
          location: {
            physicalAddress: draft.location.physicalAddress,
            country: draft.location.country,
            county: draft.location.county,
            city: draft.location.city,
            ...(draft.location.coordinates
              ? { coordinates: draft.location.coordinates }
              : {}),
          },
          unitTypes: draft.unitTypes.map(({ _id, ...rest }) => ({
            ...(/^[a-f\d]{24}$/i.test(_id) ? { _id } : {}),
            ...rest,
          })),
          billing: draft.billing,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to save");
      }
      const updated = await res.json();
      setProperty(updated);
      setSheetOpen(false);
      setDraft(null);
      setNewMethod("");
      setFormattedAddress(null);
      toast.success("Property updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

 
function setCoords(coords: { lat: number; lng: number }) {
  setDraft((prev) =>
    prev ? { ...prev, location: { ...prev.location, coordinates: coords } } : prev
  );
  reverseGeocode(coords.lat, coords.lng);
}

  const totalUnits = property.unitTypes.reduce((sum, u) => sum + u.count, 0);
  const occupiedCount = units.filter(
    (u) => u.occupancyStatus === "OCCUPIED",
  ).length;
  const vacantCount = units.filter(
    (u) => u.occupancyStatus === "VACANT",
  ).length;
  const hasCoords = !!property.location.coordinates;

  const locationLine = [
    property.location.city,
    property.location.county,
    property.location.country,
  ]
    .filter(Boolean)
    .join(", ");

  async function handleAddContact() {
    if (!newContact.role.trim() || !newContact.name.trim()) return;
    try {
      const res = await fetch(`/api/properties/${id}/contacts`, {
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
      const res = await fetch(`/api/properties/${id}/contacts/${cid}`, {
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
    <>
      {/* ── Edit sheet ── */}
<EditSheet
  sheetOpen={sheetOpen}
  closeSheet={closeSheet}
  saving={saving}
  draft={draft}
  setDraft={setDraft}
  saveEdit={saveEdit}
  newMethod={newMethod}
  setNewMethod={setNewMethod}
  geocoding={geocoding}
  reverseGeocoding={reverseGeocoding}
  formattedAddress={formattedAddress}
  runGeocode={runGeocode}
  setCoords={setCoords}
/>
      {/* ── Page ── */}
      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      
<TabStrip property={property} openSheet={openSheet} />
        {/* ── Tab content ── */}
        <div className="p-4">
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">
              {/* ── Stats ── */}
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

              {/* ── Row 1: Property Details + Location (50/50) ── */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* ── 1. Property Details ── */}
                <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
                  <SectionHeader title="Property Details" />

                  {/* Name */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Property Name
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {property.propertyName}
                    </span>
                  </div>

                  {/* Description */}
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
                  {/* Cover Photo */}
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
                      onClick={() =>
                        !uploadingPhoto && fileInputRef.current?.click()
                      }
                    >
                      {property.coverPhotoUrl ? (
                        <img
                          src={property.coverPhotoUrl}
                          alt={property.propertyName}
                          className="w-full h-full object-cover"
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

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                        {uploadingPhoto ? (
                          <Loader2 className="size-5 text-white animate-spin" />
                        ) : (
                          <>
                            <Camera className="size-5 text-white" />
                            <p className="text-xs text-white font-medium">
                              {property.coverPhotoUrl
                                ? "Change photo"
                                : "Upload photo"}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Uploading progress indicator */}
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

                {/* ── 2. Location ── */}
                <div className="bg-white rounded-lg border p-4 flex flex-col  gap-4 ">
                  <SectionHeader title="Location" />

                  {/* Address block */}
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

                  {/* City / County / Country grid */}
                  <div className="grid grid-cols-3 ">
                    {[
                      { label: "City", value: property.location.city },
                      { label: "County", value: property.location.county },
                      { label: "Country", value: property.location.country },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {label}
                        </span>
                        <span className="text-xs text-foreground">
                          {value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Map or placeholder */}
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
                            <AdvancedMarker
                              position={property.location.coordinates!}
                            />
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
                      <p className="text-[11px] text-muted-foreground/70 text-center max-w-[180px]">
                        Use the Edit sheet to pin this property on the map.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Row 2: Contacts + Communications Config ── */}
              <div className="bg-white rounded-lg border flex flex-col lg:flex-row overflow-hidden">

                {/* Left: Contacts */}
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
                        Receives rent alerts and tenant communications on behalf
                        of this property.
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
                          <SelectValue placeholder="Not assigned" />
                        </SelectTrigger>
                        <SelectContent>
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
                              setNewContact({
                                ...newContact,
                                role: e.target.value,
                              })
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
                              setNewContact({
                                ...newContact,
                                name: e.target.value,
                              })
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
                              setNewContact({
                                ...newContact,
                                phone: e.target.value,
                              })
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
                          disabled={
                            !newContact.role.trim() || !newContact.name.trim()
                          }
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
                                  <span className="text-muted-foreground/50">
                                    —
                                  </span>
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
          )}

          {/* Units */}
          {activeTab === "units" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total Units"
                  value={String(totalUnits)}
                  sub={`${property.unitTypes.length} type${property.unitTypes.length !== 1 ? "s" : ""}`}
                />
                <StatCard
                  label="Occupied"
                  value={units.length > 0 ? String(occupiedCount) : "—"}
                  sub={
                    units.length > 0
                      ? `${Math.round((occupiedCount / units.length) * 100)}% rate`
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
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {(["all", "occupied", "vacant"] as const).map((f) => {
                    const count =
                      f === "all"
                        ? units.length
                        : f === "occupied"
                          ? occupiedCount
                          : vacantCount;
                    return (
                      <button
                        key={f}
                        onClick={() => setUnitFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                          unitFilter === f
                            ? "bg-[#2D64C8] text-white border-[#2D64C8]"
                            : "bg-white text-muted-foreground border-border hover:border-[#2D64C8]/40"
                        }`}
                      >
                        {f === "all"
                          ? "All"
                          : f.charAt(0).toUpperCase() + f.slice(1)}
                        {units.length > 0 && (
                          <span className="ml-1.5 opacity-70">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  className="h-8 text-xs gap-1 cursor-pointer px-3"
                  onClick={() => router.push(`/units/new?propertyId=${id}`)}
                >
                  <Plus className="size-3" /> Add Unit
                </Button>
              </div>
              {units.length === 0 ? (
                <div className="bg-white rounded-lg border flex flex-col items-center justify-center py-16 gap-2">
                  <KeyRound className="size-6 text-muted-foreground/30" />
                  <p className="text-xs font-medium text-foreground">
                    No units added yet
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Add units to start assigning tenants and tracking occupancy.
                  </p>
                  <Button
                    variant="outline"
                    className="h-8 text-xs gap-1.5 mt-2 cursor-pointer"
                    onClick={() => router.push(`/units/new?propertyId=${id}`)}
                  >
                    <Plus className="size-3.5" /> Add your first unit
                  </Button>
                </div>
              ) : (
                (() => {
                  const filtered = units.filter((u) =>
                    unitFilter === "all"
                      ? true
                      : unitFilter === "occupied"
                        ? u.occupancyStatus === "OCCUPIED"
                        : u.occupancyStatus === "VACANT",
                  );
                  return (
                    <div className="bg-white rounded-lg border overflow-hidden">
                      {filtered.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-xs text-muted-foreground">
                            No {unitFilter} units.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full min-w-[520px] text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              {[
                                "Unit",
                                "Beds / Baths",
                                "Rent / mo",
                                "Deposit",
                                "Status",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="text-left py-2.5 px-4 font-semibold text-muted-foreground tracking-wide border-b"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {filtered.map((unit) => (
                              <tr
                                key={unit._id}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <td className="py-3 px-4 font-medium">
                                  {unit.unitNumber}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {unit.bedrooms}bd / {unit.bathrooms}ba
                                </td>
                                <td className="py-3 px-4 font-semibold text-[#2D64C8]">
                                  {formatKES(unit.rentAmount)}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {formatKES(unit.depositAmount)}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge
                                    variant="outline"
                                    className={
                                      unit.occupancyStatus === "OCCUPIED"
                                        ? "bg-green-50 text-green-700 border-[0.5px] border-green-500 text-xs font-semibold"
                                        : "text-xs font-semibold border-none text-muted-foreground"
                                    }
                                  >
                                    {unit.occupancyStatus === "OCCUPIED"
                                      ? "Occupied"
                                      : "Vacant"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Financials */}
          {activeTab === "financials" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Total Collected",
                    value: "KES 412,000",
                    trendDirection: "up" as const,
                    badge: "85% collected",
                    footer: "8% more than last month",
                  },
                  {
                    label: "Total Expenditure",
                    value: "KES 98,000",
                    trendDirection: "up" as const,
                    footer: "8% more than last month",
                  },
                  {
                    label: "Net Income",
                    value: "KES 314,000",
                    trendDirection: "up" as const,
                    footer: "6% more than last month",
                  },
                ].map((card) => {
                  const TrendIcon =
                    card.trendDirection === "up"
                      ? TrendingUpIcon
                      : TrendingDownIcon;
                  return (
                    <Card
                      key={card.label}
                      className="@container/card rounded-lg hover:bg-muted transition-colors"
                    >
                      <CardHeader>
                        <CardDescription className="text-xs">
                          {card.label} · {currentMonth}
                        </CardDescription>
                        <CardTitle className="text-xl font-semibold tabular-nums">
                          {card.value}
                        </CardTitle>
                      </CardHeader>
                      <CardFooter
                        className={`flex flex-1 ${card.badge ? "justify-between" : "justify-end"} gap-1.5 text-sm`}
                      >
                        {card.badge && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">
                            {card.badge}
                          </Badge>
                        )}
                        <div className="line-clamp-1 flex gap-2 font-medium text-xs items-center text-muted-foreground">
                          <TrendIcon className="size-3" />
                          {card.footer}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
              <div className="bg-white rounded-lg border flex flex-col items-center justify-center py-16 gap-1.5 text-center">
                <p className="text-xs font-medium text-foreground">
                  Charts coming soon
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Collection trends, expenditure breakdown, and net income
                  history will appear here.
                </p>
              </div>
            </div>
          )}

          {/* Maintenance */}
          {activeTab === "maintenance" && (
            <div className="bg-white rounded-lg border flex flex-col items-center justify-center py-20 gap-1.5 text-center">
              <p className="text-xs font-medium text-foreground">
                Maintenance tracking coming soon
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Open requests, work orders, and vendor assignments will appear
                here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
