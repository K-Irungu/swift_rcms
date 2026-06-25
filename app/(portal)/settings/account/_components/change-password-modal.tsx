"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { Field, PasswordInput } from "./field";
import { ChangePasswordData, FieldErrors } from "./types";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [data, setData] = useState<ChangePasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors<ChangePasswordData>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: FieldErrors<ChangePasswordData> = {};
    if (!data.currentPassword.trim())
      errs.currentPassword = "Current password is required.";
    if (!data.newPassword || data.newPassword.length < 8)
      errs.newPassword = "New password must be at least 8 characters.";
    if (data.newPassword === data.currentPassword)
      errs.newPassword = "New password must be different from current password.";
    if (data.confirmPassword !== data.newPassword)
      errs.confirmPassword = "Passwords do not match.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to update password.");
      }
      toast.success("Password updated. Please sign in again.");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm rounded-lg p-5">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-sm font-semibold">Change password</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            You will be signed out of all devices after this change.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="Current password" required error={errors.currentPassword}>
            <PasswordInput
              id="current-password"
              placeholder="Enter current password"
              value={data.currentPassword}
              onChange={(v) => setData({ ...data, currentPassword: v })}
              error={errors.currentPassword}
            />
          </Field>

          <Field label="New password" required error={errors.newPassword}>
            <PasswordInput
              id="new-password"
              placeholder="At least 8 characters"
              value={data.newPassword}
              onChange={(v) => setData({ ...data, newPassword: v })}
              error={errors.newPassword}
            />
          </Field>

          <Field label="Confirm new password" required error={errors.confirmPassword}>
            <PasswordInput
              id="confirm-password"
              placeholder="Repeat new password"
              value={data.confirmPassword}
              onChange={(v) => setData({ ...data, confirmPassword: v })}
              error={errors.confirmPassword}
            />
            <p className="text-[11px] text-muted-foreground">
              All active sessions will be invalidated.
            </p>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            className="h-8 text-xs cursor-pointer"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="h-8 text-xs gap-1.5 bg-[#2D64C8] hover:bg-[#2D64C8]/90 cursor-pointer"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-3 animate-spin" />}
            Update password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}