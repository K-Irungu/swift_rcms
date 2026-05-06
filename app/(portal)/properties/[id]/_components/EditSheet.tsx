"use client";

import { Dispatch, SetStateAction } from "react";
import { Draft } from "../_types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Save, X, MapPin } from "lucide-react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPanner } from "../_ui"; // adjust path if needed

// ─── Helpers ─────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────

type Props = {
  sheetOpen: boolean;
  closeSheet: () => void;
  saving: boolean;
  draft: Draft | null;
  setDraft: Dispatch<SetStateAction<Draft | null>>;
  saveEdit: () => void;
  newMethod: string;
  setNewMethod: Dispatch<SetStateAction<string>>;
  geocoding: boolean;
  reverseGeocoding: boolean;
  formattedAddress: string | null;
  runGeocode: (silent: boolean) => void;
  setCoords: (coords: { lat: number; lng: number }) => void;
};

// ─── Component ───────────────────────────────────────────

export default function EditSheet({
  sheetOpen,
  closeSheet,
  saving,
  draft,
  setDraft,
  saveEdit,
  newMethod,
  setNewMethod,
  geocoding,
  reverseGeocoding,
  formattedAddress,
  runGeocode,
  setCoords,
}: Props) {
  if (!draft) return null;

  // ─── Unit type helpers ───────────────────────────────

  function updateUnitType(idx: number, patch: Partial<Draft["unitTypes"][0]>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            unitTypes: prev.unitTypes.map((u, i) =>
              i === idx ? { ...u, ...patch } : u,
            ),
          }
        : prev,
    );
  }

  // ─── UI ─────────────────────────────────────────────

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        if (!open) closeSheet();
      }}
    >
      <SheetContent
        side="right"
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
          {/* ── Basic info ── */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Basic Info
            </p>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Property name</FieldLabel>
              <Input
                className="h-8 text-xs"
                value={draft.propertyName}
                onChange={(e) =>
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
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
          </div>

          {/* ── Location ── */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Location
            </p>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Address</FieldLabel>
              <Input
                className="h-8 text-xs"
                value={draft.location.physicalAddress}
                onChange={(e) =>
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
                  value={draft.location.city}
                  onChange={(e) =>
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
                  value={draft.location.county}
                  onChange={(e) =>
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
                value={draft.location.country}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    location: { ...draft.location, country: e.target.value },
                  })
                }
              />
            </div>

            {/* Interactive map */}
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {geocoding
                      ? "Finding location…"
                      : draft.location.coordinates
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
                    center={
                      draft.location.coordinates ?? {
                        lat: 1.2921,
                        lng: 36.8219,
                      }
                    }
                    zoom={draft.location.coordinates ? 15 : 6}
                    defaultZoom={draft.location.coordinates ? 15 : 6}
                    mapId="property-edit-map"
                    gestureHandling="greedy"
                    disableDefaultUI
                    zoomControl
                    onClick={(e) => {
                      if (e.detail.latLng) setCoords(e.detail.latLng);
                    }}
                  >
                    <MapPanner
                      coordinates={draft.location.coordinates ?? null}
                    />
                    {draft.location.coordinates && (
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

                {draft.location.coordinates && (
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
        </div>

        {/* ── Footer ── */}
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
  );
}
