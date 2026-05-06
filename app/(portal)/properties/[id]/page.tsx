"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Building2,
  CreditCard,
  KeyRound,
  BedDouble,
  Edit2,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  Phone,
  Mail,
  User,
  Bell,
  FileText,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitType = {
  _id: string;
  name: string;
  count: number;
  rentAmount: number;
  depositAmount?: number;
};

type Property = {
  _id: string;
  propertyName: string;
  description?: string;
  coverPhotoUrl?: string;
  location: {
    physicalAddress: string;
    country: string;
    county: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  unitTypes: UnitType[];
  billing: {
    rentDueDay: number;
    paymentMethods: string[];
  };
  createdAt: string;
  updatedAt: string;
};

type Unit = {
  _id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  depositAmount: number;
  occupancyStatus: "VACANT" | "OCCUPIED";
};

type Draft = {
  propertyName: string;
  description: string;
  location: {
    physicalAddress: string;
    country: string;
    county: string;
    city: string;
    coordinates: { lat: number; lng: number } | null;
  };
  unitTypes: Array<{
    _id: string;
    name: string;
    count: number;
    rentAmount: number;
    depositAmount: number;
  }>;
  billing: {
    rentDueDay: number;
    paymentMethods: string[];
  };
};

type Contact = {
  _id: string; // was: id
  role: string;
  name: string;
  phone: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_CODES: Record<string, string> = {
  Kenya: "KE",
  Uganda: "UG",
  Tanzania: "TZ",
  Rwanda: "RW",
  Ethiopia: "ET",
};

const MOCK_PROPERTY_MANAGERS = [
  { id: "pm-1", name: "Alice Kamau", email: "alice.kamau@realty.co" },
  { id: "pm-2", name: "John Mwangi", email: "john.mwangi@realty.co" },
  { id: "pm-3", name: "Grace Otieno", email: "grace.otieno@realty.co" },
];

// TODO: replace with authenticated session email
const LANDLORD_EMAIL = "owner@property.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKES(n: number) {
  return `KES ${n.toLocaleString("en-KE")}`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Map panner (must live inside <Map>) ──────────────────────────────────────

function MapPanner({
  coordinates,
}: {
  coordinates: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const prev = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!map || !coordinates) return;
    if (
      prev.current?.lat === coordinates.lat &&
      prev.current?.lng === coordinates.lng
    )
      return;
    prev.current = coordinates;
    map.panTo(coordinates);
    map.setZoom(15);
  }, [map, coordinates]);
  return null;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold text-foreground tabular-nums">
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

// ─── Field label (sheet) ──────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
      {children}
    </label>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Pulse className="size-8 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Pulse className="h-4 w-48 rounded" />
            <Pulse className="h-3 w-32 rounded" />
          </div>
        </div>
        <Pulse className="h-44 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Pulse key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Pulse className="h-52 rounded-lg" />
            <Pulse className="h-64 rounded-lg" />
          </div>
          <div className="flex flex-col gap-4">
            <Pulse className="h-64 rounded-lg" />
            <Pulse className="h-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SinglePropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const currentMonth = format(new Date(), "MMMM yyyy");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    "overview" | "units" | "financials" | "maintenance"
  >("overview");
  const [unitFilter, setUnitFilter] = useState<"all" | "vacant" | "occupied">(
    "all",
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newMethod, setNewMethod] = useState("");

  // Geocoding state
  const [geocoding, setGeocoding] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<Draft | null>(null);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Overview tab local state
  const [propertyManagerId, setPropertyManagerId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    role: "",
    name: "",
    phone: "",
  });
  const [alertRecipients, setAlertRecipients] = useState<string[]>([
    LANDLORD_EMAIL,
  ]);
  const [newAlertEmail, setNewAlertEmail] = useState("");
  const [commConfig, setCommConfig] = useState({
    invoiceTemplate: "",
    receiptTemplate: "",
    smsSender: "",
  });

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [propRes, unitsRes] = await Promise.all([
          fetch(`/api/properties/${id}`),
          fetch(`/api/properties/${id}/units`),
        ]);
        if (propRes.status === 404) {
          setNotFound(true);
          return;
        }

        if (!propRes.ok) throw new Error("Failed to load property");

        const data = await propRes.json(); // ← parse once
        setProperty(data);
        setContacts(data.contacts ?? []);

        if (unitsRes.ok) setUnits(await unitsRes.json());
      } catch {
        toast.error("Failed to load property.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?latlng=${lat},${lng}`);
      const json = await res.json();
      if (json.results?.[0])
        setFormattedAddress(json.results[0].formatted_address);
    } catch {
      // non-critical
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runGeocode = useCallback(async (silent = false) => {
    const d = draftRef.current;
    if (!d) return;
    const countryCode = COUNTRY_CODES[d.location.country];
    const seen = new Set<string>();
    const addressParts = [d.location.physicalAddress, d.location.city]
      .filter(Boolean)
      .filter((p) => {
        const k = p.toLowerCase().trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    const componentParts: string[] = [];
    if (d.location.county)
      componentParts.push(`administrative_area:${d.location.county}`);
    if (countryCode) componentParts.push(`country:${countryCode}`);
    if (addressParts.length === 0 && componentParts.length === 0) return;
    const params = new URLSearchParams();
    if (addressParts.length) params.set("address", addressParts.join(", "));
    if (componentParts.length)
      params.set("components", componentParts.join("|"));
    if (countryCode) params.set("region", countryCode.toLowerCase());
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?${params.toString()}`);
      const json = await res.json();
      if (json.status === "REQUEST_DENIED") {
        toast.error("Geocoding unavailable — check API key configuration.");
        return;
      }
      if (json.status === "ZERO_RESULTS" || !json.results?.[0]) {
        if (!silent)
          toast.error("No results found. Try a more specific address.");
        return;
      }
      const { lat, lng } = json.results[0].geometry.location;
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              location: { ...prev.location, coordinates: { lat, lng } },
            }
          : prev,
      );
      setFormattedAddress(json.results[0].formatted_address ?? null);
    } catch {
      if (!silent) toast.error("Could not reach geocoding service.");
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Debounced auto-geocode when address fields change while sheet is open
  useEffect(() => {
    if (!sheetOpen || !draft) return;
    const { physicalAddress, country, city } = draft.location;
    const ready =
      physicalAddress.trim().length > 3 &&
      country.trim() !== "" &&
      city.trim().length > 1;
    if (!ready) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runGeocode(true), 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft?.location.physicalAddress,
    draft?.location.country,
    draft?.location.county,
    draft?.location.city,
    sheetOpen,
  ]);

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
  const coords = property.location.coordinates ?? null; 
    
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
    if (coords) reverseGeocode(coords.lat, coords.lng);
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

  function updateUnitType(idx: number, patch: Partial<Draft["unitTypes"][0]>) {
    if (!draft) return;
    setDraft({
      ...draft,
      unitTypes: draft.unitTypes.map((ut, i) =>
        i === idx ? { ...ut, ...patch } : ut,
      ),
    });
  }

  function setCoords(coords: { lat: number; lng: number }) {
    setDraft((prev) =>
      prev
        ? { ...prev, location: { ...prev.location, coordinates: coords } }
        : prev,
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
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex flex-col p-0 sm:max-w-md w-full"
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-sm font-semibold">
                  Edit Property
                </SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  Changes are saved when you click Save.
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 cursor-pointer"
                onClick={closeSheet}
                disabled={saving}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
            {/* Basic info */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Basic Info
              </p>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Property name</FieldLabel>
                <Input
                  className="h-8 text-xs"
                  value={draft?.propertyName ?? ""}
                  onChange={(e) =>
                    draft &&
                    setDraft({ ...draft, propertyName: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  className="text-xs resize-none"
                  rows={3}
                  placeholder="Short description…"
                  value={draft?.description ?? ""}
                  onChange={(e) =>
                    draft && setDraft({ ...draft, description: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Location
              </p>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Address</FieldLabel>
                <Input
                  className="h-8 text-xs"
                  value={draft?.location.physicalAddress ?? ""}
                  onChange={(e) =>
                    draft &&
                    setDraft({
                      ...draft,
                      location: {
                        ...draft.location,
                        physicalAddress: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>City</FieldLabel>
                  <Input
                    className="h-8 text-xs"
                    value={draft?.location.city ?? ""}
                    onChange={(e) =>
                      draft &&
                      setDraft({
                        ...draft,
                        location: { ...draft.location, city: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>County</FieldLabel>
                  <Input
                    className="h-8 text-xs"
                    value={draft?.location.county ?? ""}
                    onChange={(e) =>
                      draft &&
                      setDraft({
                        ...draft,
                        location: { ...draft.location, county: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Country</FieldLabel>
                <Input
                  className="h-8 text-xs"
                  value={draft?.location.country ?? ""}
                  onChange={(e) =>
                    draft &&
                    setDraft({
                      ...draft,
                      location: { ...draft.location, country: e.target.value },
                    })
                  }
                />
              </div>

              {/* Interactive map */}
              <APIProvider
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {geocoding
                        ? "Finding location…"
                        : draft?.location.coordinates
                          ? "Drag the pin to fine-tune."
                          : "Fill the address above or click the map to place a pin."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 text-xs px-2.5 gap-1 cursor-pointer shrink-0"
                      onClick={() => runGeocode(false)}
                      disabled={geocoding}
                    >
                      {geocoding ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <MapPin className="size-3" />
                      )}
                      Find on map
                    </Button>
                  </div>

                  <div className="rounded-lg overflow-hidden border h-52">
                    <Map
                      defaultCenter={
                        draft?.location.coordinates ?? {
                          lat: 1.2921,
                          lng: 36.8219,
                        }
                      }
                      defaultZoom={draft?.location.coordinates ? 15 : 6}
                      mapId="property-edit-map"
                      gestureHandling="greedy"
                      disableDefaultUI
                      zoomControl
                      onClick={(e) => {
                        if (e.detail.latLng) setCoords(e.detail.latLng);
                      }}
                    >
                      <MapPanner
                        coordinates={draft?.location.coordinates ?? null}
                      />
                      {draft?.location.coordinates && (
                        <AdvancedMarker
                          position={draft.location.coordinates}
                          draggable
                          onDragEnd={(e) => {
                            if (e.latLng)
                              setCoords({
                                lat: e.latLng.lat(),
                                lng: e.latLng.lng(),
                              });
                          }}
                        />
                      )}
                    </Map>
                  </div>

                  {draft?.location.coordinates && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-mono text-muted-foreground/70">
                        {draft.location.coordinates.lat.toFixed(6)},{" "}
                        {draft.location.coordinates.lng.toFixed(6)}
                      </p>
                      {reverseGeocoding ? (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="size-2.5 animate-spin" /> Fetching
                          address…
                        </p>
                      ) : formattedAddress ? (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/70">
                            Resolved:{" "}
                          </span>
                          {formattedAddress}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </APIProvider>
            </div>

            {/* Unit types */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Unit Types
                </p>
                <Button
                  variant="outline"
                  className="h-6 text-[11px] gap-1 px-2 cursor-pointer"
                  onClick={() =>
                    draft &&
                    setDraft({
                      ...draft,
                      unitTypes: [
                        ...draft.unitTypes,
                        {
                          _id: `new-${Date.now()}`,
                          name: "",
                          count: 1,
                          rentAmount: 0,
                          depositAmount: 0,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-2.5" /> Add
                </Button>
              </div>
              {draft?.unitTypes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No unit types. Add one above.
                </p>
              )}
              {draft?.unitTypes.map((ut, idx) => (
                <div
                  key={ut._id}
                  className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder="Unit type name"
                      value={ut.name}
                      onChange={(e) =>
                        updateUnitType(idx, { name: e.target.value })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={() =>
                        draft &&
                        setDraft({
                          ...draft,
                          unitTypes: draft.unitTypes.filter(
                            (_, i) => i !== idx,
                          ),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Count</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        className="h-7 text-xs"
                        value={ut.count}
                        onChange={(e) =>
                          updateUnitType(idx, { count: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Rent (KES)</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        className="h-7 text-xs"
                        value={ut.rentAmount || ""}
                        placeholder="0"
                        onChange={(e) =>
                          updateUnitType(idx, {
                            rentAmount: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Deposit</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        className="h-7 text-xs"
                        value={ut.depositAmount || ""}
                        placeholder="—"
                        onChange={(e) =>
                          updateUnitType(idx, {
                            depositAmount: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Billing */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Billing
              </p>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Rent due day (1–31)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="h-8 text-xs w-24"
                  value={draft?.billing.rentDueDay ?? ""}
                  onChange={(e) =>
                    draft &&
                    setDraft({
                      ...draft,
                      billing: {
                        ...draft.billing,
                        rentDueDay: Math.min(
                          31,
                          Math.max(1, Number(e.target.value)),
                        ),
                      },
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Payment methods</FieldLabel>
                {(draft?.billing.paymentMethods.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {draft?.billing.paymentMethods.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#2D64C8]/5 border border-[#2D64C8]/20 text-[#2D64C8] rounded-md px-2 py-0.5"
                      >
                        {m}
                        <button
                          className="hover:text-destructive transition-colors ml-0.5"
                          onClick={() =>
                            draft &&
                            setDraft({
                              ...draft,
                              billing: {
                                ...draft.billing,
                                paymentMethods:
                                  draft.billing.paymentMethods.filter(
                                    (x) => x !== m,
                                  ),
                              },
                            })
                          }
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="e.g. M-Pesa"
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMethod.trim() && draft) {
                        e.preventDefault();
                        const val = newMethod.trim();
                        if (!draft.billing.paymentMethods.includes(val))
                          setDraft({
                            ...draft,
                            billing: {
                              ...draft.billing,
                              paymentMethods: [
                                ...draft.billing.paymentMethods,
                                val,
                              ],
                            },
                          });
                        setNewMethod("");
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="h-8 text-xs px-3 cursor-pointer shrink-0"
                    disabled={!newMethod.trim()}
                    onClick={() => {
                      if (!draft) return;
                      const val = newMethod.trim();
                      if (val && !draft.billing.paymentMethods.includes(val))
                        setDraft({
                          ...draft,
                          billing: {
                            ...draft.billing,
                            paymentMethods: [
                              ...draft.billing.paymentMethods,
                              val,
                            ],
                          },
                        });
                      setNewMethod("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="px-5 py-4 border-t shrink-0 flex-row gap-2 justify-end">
            <Button
              variant="outline"
              className="h-8 text-xs cursor-pointer"
              onClick={closeSheet}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="h-8 text-xs gap-1.5 cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Page ── */}
      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
        {/* ── Sticky header + tab strip ── */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="px-4 pt-3 pb-0 flex flex-col gap-2.5">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back */}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 cursor-pointer"
                  onClick={() => router.push("/properties/all-properties")}
                >
                  <ArrowLeft className="size-3.5" />
                </Button>

                {/* Cover photo avatar */}
                {/* <div
                  className="relative size-10 shrink-0 rounded-lg overflow-hidden cursor-pointer group border bg-muted/30"
                  onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPhotoChange} />
                  {property.coverPhotoUrl ? (
                    <img src={property.coverPhotoUrl} alt={property.propertyName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#2D64C8]/10 to-[#2D64C8]/5 flex items-center justify-center">
                      <Building2 className="size-4 text-[#2D64C8]/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    {uploadingPhoto ? <Loader2 className="size-3 text-white animate-spin" /> : <Camera className="size-3 text-white" />}
                  </div>
                </div> */}

                {/* Name + inline stats */}
                <div className="flex flex-col min-w-0">
                  <h1 className="text-sm font-semibold text-foreground leading-tight truncate">
                    {property.propertyName}
                  </h1>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* <MapPin className="size-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground">{locationLine}</span>
                    <span className="text-muted-foreground/30 select-none mx-0.5">·</span> */}
                    {/* <span className="text-[11px] text-muted-foreground">
                      {units.length > 0 ? `${occupiedCount}/${units.length} occupied` : `${totalUnits} unit${totalUnits !== 1 ? "s" : ""}`}
                    </span>
                    {vacantCount > 0 && (
                      <>
                        <span className="text-muted-foreground/30 select-none mx-0.5">·</span>
                        <span className="text-[11px] text-amber-600 font-medium">{vacantCount} vacant</span>
                      </>
                    )}
                    <span className="text-muted-foreground/30 select-none mx-0.5">·</span>
                    <span className="text-[11px] text-muted-foreground">Due {ordinal(property.billing.rentDueDay)}</span> */}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
                onClick={openSheet}
              >
                <Edit2 className="size-3.5" /> Edit
              </Button>
            </div>

            {/* Tab strip */}
            <div className="flex items-center -mb-px">
              {(
                [
                  { key: "overview", label: "Overview" },
                  {
                    key: "units",
                    label: "Units",
                    count:
                      units.length || (totalUnits > 0 ? totalUnits : undefined),
                  },
                  { key: "financials", label: "Financials" },
                  { key: "maintenance", label: "Maintenance", count: 8 },
                ] as { key: typeof activeTab; label: string; count?: number }[]
              ).map(({ key, label, count }) => (
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
                  {count !== undefined && (
                    <span
                      className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        activeTab === key
                          ? "bg-[#2D64C8]/10 text-[#2D64C8]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

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
                </div>

                {/* ── 2. Location ── */}
                <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
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
                  <div className="grid grid-cols-3 gap-3">
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
                    <div className="flex flex-col gap-2 flex-1">
                      <APIProvider
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
                      >
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

              {/* ── Row 2: Contacts (full width) ── */}
              <div className="bg-white rounded-lg border p-4">
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

                {/* ── Property Manager ── */}
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
                        if (v === "__create__") {
                          toast("Manager creation coming soon.");
                          return;
                        }
                        setPropertyManagerId(v);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 w-full">
                        <SelectValue placeholder="Not assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_PROPERTY_MANAGERS.map((pm) => (
                          <SelectItem
                            key={pm.id}
                            value={pm.id}
                            className="text-xs cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{pm.name}</span>
                              <span className="text-muted-foreground text-[11px]">
                                {pm.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="__create__"
                          className="text-xs text-[#2D64C8] font-medium cursor-pointer"
                        >
                          + Add property manager
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ── Add contact form ── */}
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

                {/* ── Contact list or empty state ── */}
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {contacts.map((c) => (
                      <div
                        key={c._id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-full bg-[#2D64C8]/10 flex items-center justify-center shrink-0">
                            <User className="size-3.5 text-[#2D64C8]" />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {c.role}
                            </span>
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="text-[11px] text-[#2D64C8] hover:underline flex items-center gap-0.5 mt-0.5 w-fit"
                              >
                                <Phone className="size-2.5" />
                                {c.phone}
                              </a>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => handleDeleteContact(c._id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
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
