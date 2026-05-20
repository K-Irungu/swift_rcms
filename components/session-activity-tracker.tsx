"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_ACTIVITY_SYNC_INTERVAL_MS = 60 * 1000;
const DEFAULT_WARNING_TIME_MS = 20 * 1000;

const IDLE_TIMEOUT_MS =
  Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS) || DEFAULT_IDLE_TIMEOUT_MS;
const ACTIVITY_SYNC_INTERVAL_MS =
  Number(process.env.NEXT_PUBLIC_ACTIVITY_SYNC_INTERVAL_MS) ||
  DEFAULT_ACTIVITY_SYNC_INTERVAL_MS;
const WARNING_TIME_MS =
  Number(process.env.NEXT_PUBLIC_WARNING_TIME_MS) || DEFAULT_WARNING_TIME_MS;
const WARNING_TIME_SECONDS = Math.ceil(WARNING_TIME_MS / 1000);

const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

type ActivityEvent = (typeof ACTIVITY_EVENTS)[number];
type ActivityHandler = (event: Event) => void;

function addActivityListeners(handler: ActivityHandler) {
  ACTIVITY_EVENTS.forEach((event: ActivityEvent) => {
    window.addEventListener(event, handler, { passive: true });
  });

  document.addEventListener("visibilitychange", handler);
}

function removeActivityListeners(handler: ActivityHandler) {
  ACTIVITY_EVENTS.forEach((event: ActivityEvent) => {
    window.removeEventListener(event, handler);
  });

  document.removeEventListener("visibilitychange", handler);
}

export function SessionActivityTracker() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_TIME_SECONDS);

  const router = useRouter();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef(0);
  const warningOpenRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    warningTimerRef.current = null;
    idleTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  // Step 1: End the browser session and send the user back to login
  const logoutAndRedirect = useCallback(async () => {
    clearTimers();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/auth/login");
  }, [clearTimers, router]);

  // Step 2: Throttle server syncs so frequent mouse movement does not spam the API
  const syncActivity = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const now = Date.now();

      if (!force && now - lastSyncRef.current < ACTIVITY_SYNC_INTERVAL_MS) {
        return;
      }

      lastSyncRef.current = now;

      const response = await fetch("/api/auth/activity", {
        method: "POST",
        keepalive: true,
      }).catch(() => null);

      if (!response || response.status === 401) {
        router.replace("/auth/login");
      }
    },
    [router],
  );

  // Step 3: Schedule warning and logout timers
  const scheduleIdleTimers = useCallback(() => {
    clearTimers();
    warningOpenRef.current = false;

    const warningDelay = Math.max(IDLE_TIMEOUT_MS - WARNING_TIME_MS, 0);

    warningTimerRef.current = setTimeout(() => {
      warningOpenRef.current = true;
      setShowWarning(true);
      setSecondsLeft(WARNING_TIME_SECONDS);

      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((current) => Math.max(current - 1, 0));
      }, 1000);
    }, warningDelay);

    idleTimerRef.current = setTimeout(logoutAndRedirect, IDLE_TIMEOUT_MS);
  }, [clearTimers, logoutAndRedirect]);

  // Step 4: Restart the client-side idle timer after every accepted activity signal
  const resetIdleTimer = useCallback(() => {
    setShowWarning(false);
    setSecondsLeft(WARNING_TIME_SECONDS);
    scheduleIdleTimers();
  }, [scheduleIdleTimers]);

  // Step 5: Let the user explicitly renew the session from the warning modal
  const stayLoggedIn = useCallback(() => {
    resetIdleTimer();
    void syncActivity({ force: true });
  }, [resetIdleTimer, syncActivity]);

  // Step 6: Treat normal frontend interaction as activity while warning is closed
  const handleActivity = useCallback(
    (event: Event) => {
      if (
        event.type === "visibilitychange" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      if (warningOpenRef.current) return;

      resetIdleTimer();
      void syncActivity();
    },
    [resetIdleTimer, syncActivity],
  );

  useEffect(() => {
    // Step 7: Start tracking as soon as the portal mounts
    scheduleIdleTimers();
    void syncActivity();
    addActivityListeners(handleActivity);

    // Step 8: Remove timers and listeners when the portal unmounts
    return () => {
      clearTimers();
      removeActivityListeners(handleActivity);
    };
  }, [clearTimers, handleActivity, scheduleIdleTimers, syncActivity]);

  return (
    <Dialog open={showWarning} onOpenChange={(open) => {
      if (!open) stayLoggedIn();
    }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-4 text-[#2D64C8]" />
            <DialogTitle className="text-sm font-semibold">
              Session ending soon
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            You will be automatically logged out in{" "}
            <span className="font-semibold text-foreground">{secondsLeft}</span>{" "}
            seconds due to inactivity.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 mt-1">
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-xs cursor-pointer"
            onClick={logoutAndRedirect}
          >
            Log out now
          </Button>
          <Button
            type="button"
            className="h-8 text-xs cursor-pointer bg-[#2D64C8] hover:bg-[#2D64C8]/90"
            onClick={stayLoggedIn}
          >
            Stay logged in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
