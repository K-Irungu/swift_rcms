"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldDescription } from "@/components/ui/field";
import { useState, useRef, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const redirectMap: Record<string, string> = {
  login: "/dashboard",
  register: "/auth/set-password",
  reset: "/auth/reset-password",
};

const backMap: Record<string, string> = {
  login: "/auth/login",
  register: "/auth/register",
  reset: "/auth/forgot-password",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface VerifyOtpFormProps extends React.ComponentProps<"form"> {
  mode: string;
  maskedEmail?: string;
  maskedPhone?: string;
  initialCooldownSeconds?: number; // Update interface
}

export function VerifyOtpForm({
  mode,
  maskedEmail,
  maskedPhone,
  initialCooldownSeconds = 0,
  ...props
}: VerifyOtpFormProps) {
  // 1. Start the cooldown state directly with the server's remaining seconds
  const [cooldown, setCooldown] = useState<number>(initialCooldownSeconds);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);

  // 2. Keep a ref to track the absolute timestamp safely inside the browser
  const targetExpiryRef = useRef<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // 3. Handle the countdown lifecycle
  useEffect(() => {
    // Establish the stable target timestamp using the browser's local clock
    if (initialCooldownSeconds > 0 && !targetExpiryRef.current) {
      targetExpiryRef.current = Date.now() + initialCooldownSeconds * 1000;
    }

    const calculateTimeLeft = () => {
      if (!targetExpiryRef.current) return 0;
      const diffInSeconds = Math.ceil((targetExpiryRef.current - Date.now()) / 1000);
      return Math.max(diffInSeconds, 0);
    };

    // Run the interval loop
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setCooldown(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        targetExpiryRef.current = null; // Reset for post-resend actions
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [initialCooldownSeconds]); // Safely resets if a page refresh updates the prop

  // ─── Update handleResend to match ──────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0) return;

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();
      
      if (data.data?.retryAfter) {
        const dynamicSeconds = Number(data.data.retryAfter);
        // Sync the ref and state immediately to kickstart the loop again
        targetExpiryRef.current = Date.now() + dynamicSeconds * 1000;
        setCooldown(dynamicSeconds);
        toast.success(data.message || "A fresh verification code has been dispatched.");
      } else if (res.ok) {
        targetExpiryRef.current = Date.now() + 60 * 1000;
        setCooldown(60);
        toast.success("Verification code resent.");
      } else {
        throw new Error(data.message || "Failed to resend code.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend OTP.";
      toast.error(message);
    }
  };

  // ─── Input Utilities ───────────────────────────────────────────────────────

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  // ─── Form Actions ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.join(""), mode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Invalid OTP");

      toast.success("Verified successfully.");
      router.push(`${redirectMap[mode]}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid OTP. Please try again.";
      toast.error(message);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // const handleResend = async () => {
  //   if (cooldown > 0) return;

  //   try {
  //     const res = await fetch("/api/auth/resend-otp", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ mode }),
  //     });

  //     const data = await res.json();

  //     // If server returns a 429 rate limit or provides a specific dynamic cooldown window
  //     if (data.data?.retryAfter) {
  //       const dynamicSeconds = Number(data.data.retryAfter);
  //       targetExpiryRef.current = Date.now() + dynamicSeconds * 1000;
  //       setCooldown(dynamicSeconds);
  //       toast.success(
  //         data.message || "A fresh verification code has been dispatched.",
  //       );
  //     } else if (res.ok) {
  //       // Fallback baseline cooldown if endpoint succeeded but didn't specify dynamic tracking time
  //       targetExpiryRef.current = Date.now() + 60 * 1000;
  //       setCooldown(60);
  //       toast.success("Verification code resent.");
  //     } else {
  //       throw new Error(data.message || "Failed to resend code.");
  //     }
  //   } catch (error: unknown) {
  //     const message =
  //       error instanceof Error
  //         ? error.message
  //         : "Failed to resend OTP. Please try again.";
  //     toast.error(message);
  //   }
  // };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form
      className={cn("flex flex-col gap-5")}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-start gap-4 text-left">
          <Link
            href={backMap[mode] ?? "/auth/login"}
            className="flex items-center gap-2 text-sm text-[#B0BDD0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <h1 className="text-3xl font-bold text-white">OTP Verification</h1>

          <div className="flex flex-col gap-1">
            <p className="text-base text-[#B0BDD0]">
              We&apos;ve sent a 6-digit code to
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {maskedPhone && (
                <span className="text-base font-semibold text-white">
                  {maskedPhone}
                </span>
              )}
              {maskedPhone && maskedEmail && (
                <span className="text-sm text-[#B0BDD0]">and</span>
              )}
              {maskedEmail && (
                <span className="text-base font-semibold text-white">
                  {maskedEmail}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-between" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="w-full aspect-square text-center text-xl font-semibold text-white bg-white/5 border border-[#B0BDD0]/22 rounded-xl focus:outline-none focus:border-[#2D64C8] focus:ring-2 focus:ring-[#2D64C8]/20 disabled:opacity-50"
            />
          ))}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading || otp.join("").length < 6}
          className="w-full bg-[#2D64C8] hover:bg-[#2D64C8]/90 hover:cursor-pointer h-11 font-semibold text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </Button>

        {/* Resend Action */}
        <FieldDescription className="text-left text-[#B0BDD0] text-sm flex items-center gap-1.5">
          {cooldown > 0 ? (
            <>
              <span>Resend code in</span>
              <span className="text-[#2D64C8] font-medium">{cooldown}s</span>
            </>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-[#2D64C8] font-medium hover:underline hover:cursor-pointer transition-colors"
            >
              Resend
            </button>
          )}
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
