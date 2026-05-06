"use client";

import { useEffect, useState } from "react";
import { MapPin, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import toast from "react-hot-toast";
import { FieldLabel, MapPanner } from "../_ui";
import { useGeocode } from "../_hooks/UseGeoCode";
import type { Draft, Property } from "../_types";

type Props = {
  open: boolean;
  property: Property;
  slug: string;
  onClose: () => void;
  onSaved: (updated: Property) => void;
};

export function EditSheet({ open, property, slug, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);


  const geo = useGeocode(draft, open, (coords) => {
    setDraft((prev) =>
      prev ? { ...prev, location: { ...prev.location, coordinates: coords } } : prev,
    );
  });

  // Seed draft whenever sheet opens
  useEffect(() => {
    if (!open) return;
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
    geo.setFormattedAddress(null);
    if (coords) geo.reverseGeocode(coords.lat, coords.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleMapPin(coords: { lat: number; lng: number }) {
    setDraft((prev) =>
      prev ? { ...prev, location: { ...prev.location, coordinates: coords } } : prev,
    );
    geo.reverseGeocode(coords.lat, coords.lng);
  }



  function close() {
    if (saving) return;
    onClose();
    setDraft(null);
    geo.setFormattedAddress(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${slug}`, {
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
            ...(draft.location.coordinates ? { coordinates: draft.location.coordinates } : {}),
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
      onSaved(updated);
      onClose();
      setDraft(null);

      geo.setFormattedAddress(null);
      toast.success("Property updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="right" showCloseButton={false} className="flex flex-col p-0 sm:max-w-md w-full">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-sm font-semibold">Edit Property</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Changes are saved when you click Save.
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" className="size-7 shrink-0 cursor-pointer" onClick={close} disabled={saving}>
              <X className="size-3.5" />
            </Button>
          </div>
        </SheetHeader>

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
                onChange={(e) => draft && setDraft({ ...draft, propertyName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Description</FieldLabel>
              <Textarea
                className="text-xs resize-none"
                rows={3}
                placeholder="Short description…"
                value={draft?.description ?? ""}
                onChange={(e) => draft && setDraft({ ...draft, description: e.target.value })}
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
                  setDraft({ ...draft, location: { ...draft.location, physicalAddress: e.target.value } })
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
                    draft && setDraft({ ...draft, location: { ...draft.location, city: e.target.value } })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>County</FieldLabel>
                <Input
                  className="h-8 text-xs"
                  value={draft?.location.county ?? ""}
                  onChange={(e) =>
                    draft && setDraft({ ...draft, location: { ...draft.location, county: e.target.value } })
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
                  draft && setDraft({ ...draft, location: { ...draft.location, country: e.target.value } })
                }
              />
            </div>

            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {geo.geocoding
                      ? "Finding location…"
                      : draft?.location.coordinates
                        ? "Drag the pin to fine-tune."
                        : "Fill the address above or click the map to place a pin."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1 cursor-pointer shrink-0"
                    onClick={() => geo.runGeocode(false)}
                    disabled={geo.geocoding}
                  >
                    {geo.geocoding ? <Loader2 className="size-3 animate-spin" /> : <MapPin className="size-3" />}
                    Find on map
                  </Button>
                </div>

                <div className="rounded-lg overflow-hidden border h-52">
                  <Map
                    defaultCenter={draft?.location.coordinates ?? { lat: 1.2921, lng: 36.8219 }}
                    defaultZoom={draft?.location.coordinates ? 15 : 6}
                    mapId="property-edit-map"
                    gestureHandling="greedy"
                    disableDefaultUI
                    zoomControl
                    onClick={(e) => { if (e.detail.latLng) handleMapPin(e.detail.latLng); }}
                  >
                    <MapPanner coordinates={draft?.location.coordinates ?? null} />
                    {draft?.location.coordinates && (
                      <AdvancedMarker
                        position={draft.location.coordinates}
                        draggable
                        onDragEnd={(e) => {
                          if (e.latLng) handleMapPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
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
                    {geo.reverseGeocoding ? (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-2.5 animate-spin" /> Fetching address…
                      </p>
                    ) : geo.formattedAddress ? (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/70">Resolved: </span>
                        {geo.formattedAddress}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </APIProvider>
          </div>

         

          
        </div>

        <SheetFooter className="px-5 py-4 border-t shrink-0 flex-row gap-2 justify-end">
          <Button variant="outline" className="h-8 text-xs cursor-pointer" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="h-8 text-xs gap-1.5 cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
            onClick={save}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
