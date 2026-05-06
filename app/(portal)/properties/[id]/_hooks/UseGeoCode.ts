// app/properties/[id]/_hooks/useGeocode.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Draft } from "../_types";
import { COUNTRY_CODES } from "../_lib";

type Coords = { lat: number; lng: number };

export function useGeocode(
  draft: Draft | null,
  enabled: boolean,
  setCoords: (coords: { lat: number; lng: number }) => void,
) {  const [geocoding, setGeocoding] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<Draft | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // ─── Reverse geocode (coords → address) ───
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?latlng=${lat},${lng}`);
      const json = await res.json();

      if (json.results?.[0]) {
        setFormattedAddress(json.results[0].formatted_address);
      }
    } catch {
      // silent fail
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  // ─── Forward geocode (address → coords) ───
  const runGeocode = useCallback(async (silent = false) => {
    const d = draftRef.current;
    if (!d) return;

    const countryCode = COUNTRY_CODES[d.location.country];

    const seen = new Set<string>();
    const addressParts = [
      d.location.physicalAddress,
      d.location.city,
    ]
      .filter(Boolean)
      .filter((p) => {
        const k = p.toLowerCase().trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    const componentParts: string[] = [];

    if (d.location.county) {
      componentParts.push(`administrative_area:${d.location.county}`);
    }

    if (countryCode) {
      componentParts.push(`country:${countryCode}`);
    }

    if (addressParts.length === 0 && componentParts.length === 0) return;

    const params = new URLSearchParams();

    if (addressParts.length) {
      params.set("address", addressParts.join(", "));
    }

    if (componentParts.length) {
      params.set("components", componentParts.join("|"));
    }

    if (countryCode) {
      params.set("region", countryCode.toLowerCase());
    }

    setGeocoding(true);

    try {
      const res = await fetch(`/api/geocode?${params.toString()}`);
      const json = await res.json();

      if (json.status === "REQUEST_DENIED") {
        toast.error("Geocoding unavailable — check API key.");
        return;
      }

      if (json.status === "ZERO_RESULTS" || !json.results?.[0]) {
        if (!silent) {
          toast.error("No results found. Try a more specific address.");
        }
        return;
      }

      const { lat, lng } = json.results[0].geometry.location as Coords;
      setFormattedAddress(json.results[0].formatted_address ?? null);
      setCoords({ lat, lng });
    } catch {
      if (!silent) toast.error("Could not reach geocoding service.");
    } finally {
      setGeocoding(false);
    }
  }, []);

  // ─── Debounced auto-geocode ───
  useEffect(() => {
    if (!enabled || !draft) return;

    const { physicalAddress, country, city } = draft.location;

    const ready =
      physicalAddress?.trim().length > 3 &&
      country?.trim() !== "" &&
      city?.trim().length > 1;

    if (!ready) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      await runGeocode(true);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    draft?.location.physicalAddress,
    draft?.location.country,
    draft?.location.county,
    draft?.location.city,
    enabled,
    runGeocode,
  ]);

  return {
    geocoding,
    reverseGeocoding,
    formattedAddress,
    setFormattedAddress,
    runGeocode,
    reverseGeocode,
  };
}