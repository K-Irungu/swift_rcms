"use client";

import { Bell } from "lucide-react";
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

const notifications = [
  {
    id: 1,
    title: "New Message",
    description: "You received a new message from Kevin.",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    title: "System Update",
    description: "Server maintenance scheduled for tonight.",
    time: "1h ago",
    unread: false,
  },
];

export function NavNotifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 hover:bg-black/5 cursor-pointer border border-border rounded-md outline-none focus-visible:ring-0 focus-visible:outline-none"
        >
          <Bell className="size-4 text-muted-foreground" />
          {/* Notification Dot */}
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 border-2 border-background" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 rounded-lg transition-all"
        align="end"
        sideOffset={10}
      >
        <DropdownMenuLabel className="font-semibold py-2 px-4">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup className="max-h-[350px] overflow-y-auto ">
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start  p-2 cursor-pointer focus:bg-muted/50 rounded-sm"
            >
              <div className="flex w-full justify-between items-center">
                <span
                  className={`text-xs font-medium ${n.unread ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {n.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {n.time}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-normal">
                {n.description}
              </p>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer justify-center text-xs font-medium text-primary py-2.5">
          Mark all as read
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
