import { Clock, Loader2 } from "lucide-react";
import { PendingInvite } from "../_types";
import { useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pendingInvite: PendingInvite;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PendingInviteBanner = ({ pendingInvite, onCancel }: Props) => {
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Clock className="size-3 shrink-0 text-amber-500" />
      <span className="truncate">
        Invite pending &mdash;{" "}
        <span className="font-medium text-foreground">
          {pendingInvite.managerName}
        </span>
      </span>
      <span className="shrink-0">·</span>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="shrink-0 text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        {cancelling ? <Loader2 className="size-3 animate-spin" /> : "Cancel"}
      </button>
    </div>
  );
};
