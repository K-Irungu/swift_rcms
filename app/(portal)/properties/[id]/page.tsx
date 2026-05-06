"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  CreditCard,
  KeyRound,
  BedDouble,
  CircleDollarSign,
  Edit2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKES(n: number) {
  return `KES ${n.toLocaleString("en-KE")}`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="size-7 rounded-md bg-[#2D64C8]/10 flex items-center justify-center">
          <Icon className="size-3.5 text-[#2D64C8]" />
        </div>
      </div>
      <span className="text-lg font-semibold text-foreground tabular-nums">{value}</span>
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );
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

        setProperty(await propRes.json());

        if (unitsRes.ok) setUnits(await unitsRes.json());
      } catch {
        toast.error("Failed to load property.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <PageSkeleton />;

  if (notFound || !property) {
    return (
      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full items-center justify-center gap-3 p-8">
        <Building2 className="size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">Property not found</p>
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

  const totalUnits = property.unitTypes.reduce((sum, u) => sum + u.count, 0);
  const occupiedCount = units.filter((u) => u.occupancyStatus === "OCCUPIED").length;
  const vacantCount = units.filter((u) => u.occupancyStatus === "VACANT").length;
  const hasCoords = !!property.location.coordinates;

  const rentAmounts = property.unitTypes.map((u) => u.rentAmount);
  const rentMin = rentAmounts.length ? Math.min(...rentAmounts) : 0;
  const rentMax = rentAmounts.length ? Math.max(...rentAmounts) : 0;
  const rentDisplay =
    rentAmounts.length === 0
      ? "—"
      : rentMin === rentMax
      ? formatKES(rentMin)
      : `${formatKES(rentMin)} – ${formatKES(rentMax)}`;

  const locationLine = [
    property.location.city,
    property.location.county,
    property.location.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4">

        {/* ── Top bar ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 mt-0.5 cursor-pointer"
              onClick={() => router.push("/properties/all-properties")}
            >
              <ArrowLeft className="size-3.5" />
            </Button>
            <div className="flex  gap-1">
              <h1 className="text-sm font-semibold text-foreground leading-tight">
                {property.propertyName}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="size-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">{locationLine}</span>
                <span className="text-muted-foreground/40 text-xs select-none">·</span>
                <span className="text-[11px] text-muted-foreground">
                  Added {format(new Date(property.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="h-8 text-xs gap-1.5 cursor-pointer"
              onClick={() => router.push(`/properties/${id}/edit`)}
            >
              <Edit2 className="size-3.5" /> Edit
            </Button>
            <Button
              className="h-8 text-xs gap-1.5 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer"
              onClick={() => router.push(`/units/new?propertyId=${id}`)}
            >
              <Plus className="size-3.5" /> Add Unit
            </Button>
          </div>
        </div>

        {/* ── Cover photo ── */}
        <div className="rounded-lg border overflow-hidden bg-white h-44 relative">
          {property.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.coverPhotoUrl}
              alt={property.propertyName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2D64C8]/10 to-[#2D64C8]/5 flex flex-col items-center justify-center gap-2">
              <div className="size-12 rounded-xl bg-[#2D64C8]/10 flex items-center justify-center">
                <Building2 className="size-6 text-[#2D64C8]/50" />
              </div>
              <span className="text-xs text-muted-foreground">No cover photo</span>
            </div>
          )}
          {property.description && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-4 py-3">
              <p className="text-xs text-white/90 line-clamp-2">{property.description}</p>
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Unit Types"
            value={String(property.unitTypes.length)}
            sub={`${totalUnits} total unit${totalUnits !== 1 ? "s" : ""}`}
            icon={Building2}
          />
          <StatCard
            label="Occupancy"
            value={
              units.length > 0
                ? `${occupiedCount} / ${units.length}`
                : `0 / ${totalUnits}`
            }
            sub={
              units.length > 0
                ? `${vacantCount} vacant`
                : "No units added yet"
            }
            icon={KeyRound}
          />
          <StatCard
            label="Rent Range"
            value={rentDisplay}
            sub="per month"
            icon={CircleDollarSign}
          />
          <StatCard
            label="Rent Due"
            value={ordinal(property.billing.rentDueDay)}
            sub="of every month"
            icon={Calendar}
          />
        </div>

        {/* ── Main body ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Unit types */}
            <div className="bg-white rounded-lg border p-4">
              <SectionHeader
                title="Unit Types"
                action={
                  <span className="text-[11px] text-muted-foreground">
                    {totalUnits} unit{totalUnits !== 1 ? "s" : ""} total
                  </span>
                }
              />
              {property.unitTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <BedDouble className="size-5 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    No unit types configured.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y">
                  {property.unitTypes.map((ut) => (
                    <div
                      key={ut._id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 flex-wrap"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground">
                          {ut.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {ut.count} unit{ut.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[11px] text-muted-foreground">
                            Monthly rent
                          </span>
                          <span className="text-xs font-semibold text-[#2D64C8]">
                            {formatKES(ut.rentAmount)}
                          </span>
                        </div>
                        {ut.depositAmount != null && ut.depositAmount > 0 && (
                          <div className="flex flex-col gap-0.5 text-right">
                            <span className="text-[11px] text-muted-foreground">
                              Deposit
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              {formatKES(ut.depositAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual units */}
            <div className="bg-white rounded-lg border p-4">
              <SectionHeader
                title="Units"
                action={
                  <Button
                    variant="outline"
                    className="h-7 text-xs gap-1 cursor-pointer px-2.5"
                    onClick={() =>
                      router.push(`/units/new?propertyId=${id}`)
                    }
                  >
                    <Plus className="size-3" /> Add Unit
                  </Button>
                }
              />
              {units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <KeyRound className="size-5 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    No units added yet.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Add units to start assigning tenants and tracking occupancy.
                  </p>
                </div>
              ) : (
                <div className="overflow-auto -mx-4 px-4">
                  <table className="w-full min-w-[480px] text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground tracking-wide first:rounded-l-md last:rounded-r-md">
                          Unit
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground tracking-wide">
                          Beds / Baths
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground tracking-wide">
                          Rent / mo
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground tracking-wide">
                          Deposit
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit) => (
                        <tr
                          key={unit._id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-medium">
                            {unit.unitNumber}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {unit.bedrooms}bd / {unit.bathrooms}ba
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#2D64C8]">
                            {formatKES(unit.rentAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {formatKES(unit.depositAmount)}
                          </td>
                          <td className="py-2.5 px-3">
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
                </div>
              )}
            </div>

          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Location */}
            <div className="bg-white rounded-lg border p-4">
              <SectionHeader title="Location" />
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Address
                  </span>
                  <span className="text-xs text-foreground">
                    {property.location.physicalAddress}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      City
                    </span>
                    <span className="text-xs text-foreground">
                      {property.location.city || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      County
                    </span>
                    <span className="text-xs text-foreground">
                      {property.location.county || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Country
                    </span>
                    <span className="text-xs text-foreground">
                      {property.location.country || "—"}
                    </span>
                  </div>
                  {hasCoords && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Coordinates
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground leading-snug">
                        {property.location.coordinates!.lat.toFixed(5)},{" "}
                        {property.location.coordinates!.lng.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>

                {hasCoords && (
                  <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                    <div className="rounded-md overflow-hidden border border-border h-36">
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
                )}
              </div>
            </div>

            {/* Billing */}
            <div className="bg-white rounded-lg border p-4">
              <SectionHeader title="Billing" />
              <div className="flex flex-col divide-y">
                <div className="pb-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Rent due</span>
                  <span className="text-xs font-medium text-foreground">
                    {ordinal(property.billing.rentDueDay)} of month
                  </span>
                </div>
                <div className="pt-3 flex items-start justify-between gap-3">
                  <span className="text-xs text-muted-foreground shrink-0">
                    Payment methods
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {property.billing.paymentMethods.map((m) => (
                      <Badge
                        key={m}
                        variant="outline"
                        className="text-[11px] font-medium bg-[#2D64C8]/5 border-[#2D64C8]/20 text-[#2D64C8] gap-1"
                      >
                        <CreditCard className="size-2.5" />
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
