

"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Property, Unit, Contact } from "../_types";

export function useProperty(id: string) {
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

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

        const data = await propRes.json();

        setProperty(data);
        setContacts(data.contacts ?? []);

        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(unitsData);
        }
      } catch {
        toast.error("Failed to load property.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  return { property, setProperty, units, contacts, setContacts, loading, notFound };
}