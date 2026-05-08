"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "../_ui";
import type { NewContact } from "../_types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onSave: (contact: NewContact) => Promise<void>;
  onCancel: () => void;
}

// ─── Field config ─────────────────────────────────────────────────────────────

const FIELDS: { key: keyof NewContact; label: string; placeholder: string }[] = [
  { key: "role",  label: "Role",      placeholder: "e.g. Caretaker" },
  { key: "name",  label: "Full Name", placeholder: "Full name"      },
  { key: "phone", label: "Phone",     placeholder: "+254…"          },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AddContactForm({ onSave, onCancel }: Props) {

  // State
  const [contact, setContact] = useState<NewContact>({ role: "", name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // Handlers
  function update(field: keyof NewContact, value: string) { setContact((prev) => ({ ...prev, [field]: value }))}

  async function handleSave() {
    if (!contact.role.trim() || !contact.name.trim()) return;
    setSaving(true);
    try {
      await onSave(contact);
      setContact({ role: "", name: "", phone: "" });
    } finally {
      setSaving(false);
    }
  }

  // Render
  return (
    <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2 mb-4">

      {/* Header */}
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
        New Contact
      </p>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <FieldLabel>{label}</FieldLabel>
            <Input
              className="h-7 text-xs"
              placeholder={placeholder}
              value={contact[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 justify-end mt-1">
        <Button
          variant="ghost"
          className="h-7 text-xs px-2 cursor-pointer"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="h-7 text-xs px-3 cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
          disabled={!contact.role.trim() || !contact.name.trim() || saving}
          onClick={handleSave}
        >
          Save Contact
        </Button>
      </div>

    </div>
  );
}
