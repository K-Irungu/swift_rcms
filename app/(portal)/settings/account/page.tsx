"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { AvatarSection } from "./_components/avatar-section";
import { SecurityRow } from "./_components/security-row";
import { AccountMetaCard } from "./_components/account-meta-card";
import { ChangeEmailModal } from "./_components/change-email-modal";
import { ChangePasswordModal } from "./_components/change-password-modal";
import { Field, inputCls } from "./_components/field";
import { ProfileData, FieldErrors, Role } from "./_components/types";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountPage() {
  // ── Mock user — replace with useSession / your auth hook ──
  const user = {
    fullName: "Kevin Irungu",
    email: "kevin@swiftrcms.com",
    phoneNumber: "+254 700 000 000",
    role: Role.LANDLORD,
    isActive: true,
    createdAt: "2024-01-15T00:00:00.000Z",
  };

  const [firstName, ...rest] = user.fullName.split(" ");
  const lastName = rest.join(" ");

  // ── Profile form state ──
  const [profile, setProfile] = useState<ProfileData>({
    firstName,
    lastName,
    phoneNumber: user.phoneNumber,
  });
  const [profileErrors, setProfileErrors] = useState<FieldErrors<ProfileData>>({});
  const [saving, setSaving] = useState(false);

  // ── Avatar state ──
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleAvatarUpload = (file: File) => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleAvatarRemove = () => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarFile(null);
    setAvatarUrl(null);
  };

  // ── Modal state ──
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // ── Validation ──
  const validateProfile = (): boolean => {
    const errs: FieldErrors<ProfileData> = {};
    if (!profile.firstName.trim()) errs.firstName = "First name is required.";
    if (!profile.lastName.trim()) errs.lastName = "Last name is required.";
    if (!profile.phoneNumber.trim()) errs.phoneNumber = "Phone number is required.";
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save handler ──
  const handleSave = async () => {
    if (!validateProfile()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append(
        "profile",
        JSON.stringify({
          fullName: `${profile.firstName.trim()} ${profile.lastName.trim()}`,
          phoneNumber: profile.phoneNumber.trim(),
        }),
      );
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to save profile.");
      }
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
      <div className="p-4 flex flex-col gap-4 w-full max-w-lg">

        {/* ── Page heading ── */}
        <div>
          <h1 className="text-xs font-semibold text-foreground">Account</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your personal information and security settings.
          </p>
        </div>

        {/* ── Profile card ── */}
        <div className="rounded-lg border bg-white p-4 flex flex-col gap-4">
          <AvatarSection
            avatarUrl={avatarUrl}
            initials={initials}
            onUpload={handleAvatarUpload}
            onRemove={handleAvatarRemove}
          />

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Personal information
            </p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" required error={profileErrors.firstName}>
                  <Input
                    className={inputCls(profileErrors.firstName)}
                    placeholder="First name"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </Field>
                <Field label="Last name" required error={profileErrors.lastName}>
                  <Input
                    className={inputCls(profileErrors.lastName)}
                    placeholder="Last name"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Phone number" required error={profileErrors.phoneNumber}>
                <Input
                  className={inputCls(profileErrors.phoneNumber)}
                  placeholder="+254 700 000 000"
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Security card ── */}
        <div className="rounded-lg border bg-white p-4 flex flex-col">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Security
          </p>
          <SecurityRow
            label="Email address"
            meta={user.email}
            onClick={() => setEmailModalOpen(true)}
          />
          <SecurityRow
            label="Password"
            meta="Last changed 3 months ago"
            onClick={() => setPasswordModalOpen(true)}
          />
        </div>

        {/* ── Account meta card ── */}
        <AccountMetaCard
          role={user.role}
          createdAt={user.createdAt}
          isActive={user.isActive}
        />

        {/* ── Save bar ── */}
        <div className="flex justify-end">
          <Button
            className="h-8 text-xs font-semibold gap-1.5 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer px-5"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* ── Modals ── */}
      <ChangeEmailModal
        open={emailModalOpen}
        currentEmail={user.email}
        onClose={() => setEmailModalOpen(false)}
      />
      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}