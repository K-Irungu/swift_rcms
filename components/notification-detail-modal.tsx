"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type AppNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  MANAGER_INVITE: "View Invitation",
};

type Props = {
  notification: AppNotification | null;
  onClose: () => void;
};

export function NotificationDetailModal({ notification, onClose }: Props) {
  const router = useRouter();

  if (!notification) return null;

  const actionLabel = notification.link ? ACTION_LABELS[notification.type] : undefined;

  function handleAction() {
    if (!notification?.link) return;
    onClose();
    router.push(notification.link);
  }

  return (
    <Dialog open={!!notification} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="size-4 text-[#2D64C8]" />
            <DialogTitle className="text-sm font-semibold">{notification.title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {notification.message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 mt-1">
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-xs cursor-pointer"
            onClick={onClose}
          >
            Dismiss
          </Button>
          {actionLabel && (
            <Button
              type="button"
              className="h-8 text-xs cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
              onClick={handleAction}
            >
              {actionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
