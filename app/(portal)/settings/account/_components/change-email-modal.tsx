"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { Field, PasswordInput, inputCls } from "./field";
import { ChangeEmailData, FieldErrors } from "./types";

type ChangeEmailModalProps = {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
};

export function ChangeEmailModal({ open, currentEmail, onClose }: ChangeEmailModalProps) {
  const [data, setData] = useState<ChangeEmailData>({
    newEmail: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors<ChangeEmailData>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: FieldErrors<ChangeEmailData> = {};
    if (!data.newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.newEmail))
      errs.newEmail = "Enter a valid email address.";
    if (data.newEmail.toLowerCase() === currentEmail.toLowerCase())
      errs.newEmail = "New email must be different from current email.";
    if (!data.confirmPassword.trim())
      errs.confirmPassword = "Password is required to confirm this change.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: data.newEmail, password: data.confirmPassword }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to initiate email change.");
      }
      toast.success("Verification link sent to your new email.");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setData({ newEmail: "", confirmPassword: "" });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm rounded-lg p-5">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-sm font-semibold">Change email address</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A verification link will be sent to your new email. Your current email will also
            receive a security notice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="Current email">
            <Input
              className={inputCls() + " bg-muted/40 text-muted-foreground"}
              value={currentEmail}
              readOnly
            />
          </Field>

          <Field label="New email" required error={errors.newEmail}>
            <Input
              className={inputCls(errors.newEmail)}
              placeholder="Enter new email address"
              value={data.newEmail}
              onChange={(e) => setData({ ...data, newEmail: e.target.value })}
            />
          </Field>

          <Field label="Confirm with your password" required error={errors.confirmPassword}>
            <PasswordInput
              id="email-change-password"
              placeholder="Your current password"
              value={data.confirmPassword}
              onChange={(v) => setData({ ...data, confirmPassword: v })}
              error={errors.confirmPassword}
            />
            <p className="text-[11px] text-muted-foreground">
              Change only takes effect after you verify the new email.
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
            Send verification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}