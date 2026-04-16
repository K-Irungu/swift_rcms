"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldDescription } from "@/components/ui/field";
import { useState, useRef, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESEND_COOLDOWN = 60;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// +254712345678 → +2547*****678
function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return phone.slice(0, 4) + "*****" + phone.slice(-3);
}

// john.doe@example.com → jo***@example.com
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "***@" + domain;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VerifyOtpForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // Capture phone, email, and mode (login/register/reset) from query params to send to the API
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "login";
  const phone = searchParams.get("phone") || "";
  const email = searchParams.get("email") || "";

  // Counts down the resend cooldown timer one second at a time
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // ─── OTP Input Handlers ───────────────────────────────────────────────────

  // Accepts only digits, updates state, and advances focus to the next input
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  // Moves focus back to the previous input on backspace if the current input is empty
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Fills all 6 inputs at once when a full OTP is pasted
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

  // ─── Actions ──────────────────────────────────────────────────────────────

  // Submits the OTP to the API and redirects on success
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.join(""), phone, email, mode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success)
        throw new Error(data.message || "Invalid OTP");

      toast.success("Verified successfully.");
      const params = new URLSearchParams({ phone, email });
      router.push(`${redirectMap[mode]}?${params.toString()}`);
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

  // Requests a new OTP and resets the cooldown timer
  const handleResend = async () => {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, mode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to resend OTP");

      toast.success("OTP resent successfully.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to resend OTP. Please try again.";
      toast.error(message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
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

          {/* Masked delivery targets */}
          <div className="flex flex-col gap-1">
            <p className="text-base text-[#B0BDD0]">
              We&apos;ve sent a 6-digit code to
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {phone && (
                <span className="text-base font-semibold text-white">
                  {maskPhone(phone)}
                </span>
              )}
              {phone && email && (
                <span className="text-sm text-[#B0BDD0]">and</span>
              )}
              {email && (
                <span className="text-base font-semibold text-white">
                  {maskEmail(email)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* OTP inputs — single digit per box, supports paste */}
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

        {/* Submit — disabled until all 6 digits are entered */}
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

        {/* Resend — locked behind a cooldown timer */}
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
