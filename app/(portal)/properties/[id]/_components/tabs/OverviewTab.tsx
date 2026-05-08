"use client";

import { useRef, useState } from "react";
import { Building2, MapPin, Camera, Loader2 } from "lucide-react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import toast from "react-hot-toast";
import { SectionHeader } from "../../_ui";
import Image from "next/image";
import { OverviewTabProps } from "../../_types";

export function OverviewTab({
  property,
  slug,
  onPropertyUpdate,
}: OverviewTabProps) {

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const hasCoords = !!property.location.coordinates;
  const locationLine = [
    property.location.city,
    property.location.county,
    property.location.country,
  ]
    .filter(Boolean)
    .join(", ");

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Property Details + Location */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-white rounded-lg border p-4 flex flex-col gap-4 justify-between">
          <SectionHeader title="Property Details" />
          <div className="flex flex-col gap-0.5">
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
          <div className="flex flex-col gap-1.5 pt-2">
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

    </div>
  );

  // ─── Cover photo handler ────────────────────────────────────────────────────

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

}
