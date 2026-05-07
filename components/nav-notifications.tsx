"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationDetailModal } from "@/components/notification-detail-modal";

type AppNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NavNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AppNotification | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", (e: MessageEvent) => {
      const incoming: AppNotification = JSON.parse(e.data);
      setNotifications((prev) => [incoming, ...prev]);
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) es.close();
    };

    return () => es.close();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function openNotification(notification: AppNotification) {
    setSelected(notification);
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification._id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)),
      );
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 hover:bg-black/5 cursor-pointer border border-border rounded-md outline-none focus-visible:ring-0 focus-visible:outline-none"
        >
          <Bell className="size-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 rounded-lg" align="end" sideOffset={10}>
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[11px] text-muted-foreground">{unreadCount} unread</span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="h-[320px] overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n._id}
                className="flex flex-col items-start gap-0.5 p-2 cursor-pointer focus:bg-muted/50 rounded-sm"
                onClick={() => openNotification(n)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!n.isRead && (
                      <span className="size-1.5 rounded-full bg-[#2D64C8] shrink-0" />
                    )}
                    <span
                      className={`text-xs font-medium truncate ${
                        n.isRead ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {n.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed line-clamp-2 ${
                    n.isRead ? "text-muted-foreground/60" : "text-muted-foreground"
                  } ${!n.isRead ? "pl-3" : ""}`}
                >
                  {n.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={`justify-center text-xs font-medium py-2.5 cursor-pointer ${
                unreadCount === 0
                  ? "text-muted-foreground pointer-events-none"
                  : "text-[#2D64C8]"
              }`}
              onClick={markAllRead}
            >
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <NotificationDetailModal
      notification={selected}
      onClose={() => setSelected(null)}
    />
    </>
  );
}
