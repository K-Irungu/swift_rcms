"use client";

import { useEffect, useState } from "react";
import { Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { SectionHeader } from "../../_ui";
import { ConfirmPasswordDialog } from "../ConfirmPasswordDialog";
import { AddContactForm } from "../AddContactForm";
import { ContactsList } from "../ContactsList";
import { PendingInviteBanner } from "../PendingInviteBanner";
import type { Contact, NewContact, PendingInvite, Property } from "../../_types";

type Props = {
  slug:        string;
  property:    Property;
  contacts:    Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
};

export function ContactsTab({ slug, property, contacts, setContacts }: Props) {
  const [managers,          setManagers]          = useState<{ _id: string; fullName: string; email: string }[]>([]);
  const [managersLoading,   setManagersLoading]   = useState(false);
  const [propertyManagerId, setPropertyManagerId] = useState(property.propertyManager?._id ?? "");
  const [pendingManagerId,  setPendingManagerId]  = useState<string | null>(null);
  const [pendingInvite,     setPendingInvite]     = useState<PendingInvite | null>(null);
  const [addingContact,     setAddingContact]     = useState(false);

  useEffect(() => {
    fetchManagers();
    fetchPendingInvite();
  }, []);

  // SSE — listen for manager acceptance / invite expiry
  useEffect(() => {
    if (!pendingInvite) return;
    const es = new EventSource(`/api/properties/${slug}/manager/invite/stream`);

    es.addEventListener("manager-assigned", (e: MessageEvent) => {
      const { managerId, managerName } = JSON.parse(e.data);
      es.close();
      fetchManagers();
      setPropertyManagerId(managerId);
      setPendingInvite(null);
      toast.success(`${managerName} has accepted the invitation`);
    });
    es.addEventListener("invite-expired", () => {
      es.close();
      setPendingInvite(null);
    });
    es.onerror = () => { if (es.readyState === EventSource.CLOSED) es.close(); };
    return () => es.close();
  }, [pendingInvite]);

  return (
    <div className="flex flex-col gap-4">
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
                Receives rent alerts and tenant communications on behalf of this property.
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-56 flex flex-col gap-2">
              <Select
                value={propertyManagerId}
                disabled={!!pendingInvite}
                onOpenChange={(open) => { if (open) fetchManagers(); }}
                onValueChange={(v) => {
                  if (v === "__remove__") { handleManagerRemove(); return; }
                  setPendingManagerId(v);
                }}
              >
                <SelectTrigger className="h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 w-full disabled:opacity-60 disabled:cursor-not-allowed">
                  <SelectValue placeholder={managersLoading ? "Loading..." : "Not assigned"} />
                </SelectTrigger>
                <SelectContent className="p-1">
                  {managers.map((m) => (
                    <SelectItem key={m._id} value={m._id} className="text-xs cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium">{m.fullName}</span>
                        <span className="text-muted-foreground text-[11px]">{m.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {propertyManagerId && !pendingInvite && (
                    <SelectItem value="__remove__" className="text-xs text-destructive font-medium cursor-pointer">
                      Remove manager
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {pendingInvite && (
                <PendingInviteBanner pendingInvite={pendingInvite} onCancel={handleCancelInvite} />
              )}
            </div>
          </div>

          {addingContact && (
            <AddContactForm onSave={handleAddContact} onCancel={() => setAddingContact(false)} />
          )}

          <ContactsList contacts={contacts} isFormOpen={addingContact} onDelete={handleDeleteContact} />
        </div>
      </div>

      <ConfirmPasswordDialog
        open={!!pendingManagerId}
        managerName={managers.find((m) => m._id === pendingManagerId)?.fullName ?? ""}
        onConfirmed={handleInviteConfirmed}
        onCancel={() => setPendingManagerId(null)}
      />
    </div>
  );

  async function fetchManagers() {
    setManagersLoading(true);
    try {
      const res  = await fetch("/api/users?role=PROPERTY_MANAGER");
      const data = await res.json();
      setManagers(data);
    } catch { toast.error("Failed to load managers"); }
    finally  { setManagersLoading(false); }
  }

  async function fetchPendingInvite() {
    try {
      const res  = await fetch(`/api/properties/${slug}/manager/invite`);
      const data = await res.json();
      setPendingInvite(data.data ?? null);
    } catch { /* non-critical */ }
  }

  async function handleManagerRemove() {
    const res = await fetch(`/api/properties/${slug}/manager`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: null }),
    });
    if (!res.ok) { toast.error("Failed to remove manager"); return; }
    setPropertyManagerId("");
    toast.success("Manager removed");
  }

  async function handleManagerInvite(managerId: string) {
    const res  = await fetch(`/api/properties/${slug}/manager/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });
    const body = await res.json();
    if (!res.ok || body.success !== true) {
      toast.error(body.message || "Failed to send invite");
      throw new Error(body.message);
    }
    toast.success(body.message || "Invitation sent — awaiting manager's acceptance");
    return body.data as { token: string; expiresAt: string };
  }

  async function handleCancelInvite() {
    try {
      const res  = await fetch(`/api/properties/${slug}/manager/invite`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to cancel invitation"); return; }
      setPendingInvite(null);
      toast.success("Invitation cancelled");
    } catch { toast.error("Failed to cancel invitation"); }
  }

  async function handleInviteConfirmed() {
    if (!pendingManagerId) return;
    const invited = managers.find((m) => m._id === pendingManagerId);
    const result  = await handleManagerInvite(pendingManagerId);
    setPendingInvite({
      managerName:  invited?.fullName ?? "",
      managerEmail: invited?.email   ?? "",
      expiresAt:    result?.expiresAt ?? "",
    });
    setPendingManagerId(null);
  }

  async function handleAddContact(contact: NewContact) {
    const res = await fetch(`/api/properties/${slug}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    if (!res.ok) throw new Error();
    const added = await res.json();
    setContacts((prev) => [...prev, added]);
    toast.success(added.name ? `${added.name} added as a contact.` : "Contact added.");
  }

  async function handleDeleteContact(cid: string) {
    try {
      const res = await fetch(`/api/properties/${slug}/contacts/${cid}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContacts((prev) => prev.filter((c) => c._id !== cid));
      toast.success("Contact removed.");
    } catch { toast.error("Failed to remove contact."); }
  }
}
