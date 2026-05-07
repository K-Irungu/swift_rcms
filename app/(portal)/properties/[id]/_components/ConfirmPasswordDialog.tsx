"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FieldLabel } from "../_ui";
import toast from "react-hot-toast";

type Props = {
  open: boolean;
  managerName: string;
  onConfirmed: () => void;
  onCancel: () => void;
};

export function ConfirmPasswordDialog({ open, managerName, onConfirmed, onCancel }: Props) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  function handleCancel() {
    setPassword("");
    setError("");
    onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;

    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (!res.ok || !json.data?.verified) {
        setError(json.message || "Failed to verify password");
        return;
      }

      setPassword("");
      setError("");
      onConfirmed();
    } catch {
      toast.error("An error occurred while verifying your password. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-4 text-[#2D64C8]" />
            <DialogTitle className="text-sm font-semibold">Confirm your identity</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            You are about to assign <span className="font-medium text-foreground">{managerName}</span> as
            property manager for this property. Enter your password to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1">
            <FieldLabel>Your password</FieldLabel>
            <Input
              type="password"
              className="h-8 text-xs"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              autoFocus
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 mt-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-xs cursor-pointer"
              onClick={handleCancel}
              disabled={verifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8 text-xs cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
              disabled={!password || verifying}
            >
              {verifying ? <Loader2 className="size-3 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
