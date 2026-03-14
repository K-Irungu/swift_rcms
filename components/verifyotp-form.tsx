// verify-otp-form.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldDescription } from "@/components/ui/field";
import { useState, useRef, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

const RESEND_COOLDOWN = 60;

const redirectMap: Record<string, string> = {
  login:  "/dashboard",
  signup: "/auth/set-password",
  reset:  "/auth/reset-password",
};

const backMap: Record<string, string> = {
  login:  "/auth/login",
  signup: "/auth/signup",
  reset:  "/auth/forgot-password",
};

export function VerifyOtpForm({ phone = "+254 7** *** *09", className, ...props }: { phone?: string } & React.ComponentProps<"form">) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "login";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: replace with verifyOtp(otp.join(""))
      toast.success("Phone verified.");
      router.push(redirectMap[mode] ?? "/dashboard");
    } catch (error) {
      toast.error("Invalid OTP. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO: replace with resendOtp()
      toast.success("OTP resent.");
    } catch (error) {
      toast.error("Failed to resend OTP.");
      console.error(error);
    }
  };

  return (
    <form className={cn("flex flex-col gap-5", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-start gap-4 text-left">
          <a href={backMap[mode] ?? "/auth/login"} className="flex items-center gap-2 text-sm text-[#B0BDD0] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
          <h1 className="text-3xl font-bold text-white">OTP Verification</h1>
          <div>
            <p className="text-base text-[#B0BDD0]">We&apos;ve sent a 6 digit code to</p>
            <p className="text-base font-semibold text-white">{phone}</p>
          </div>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-between" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
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
          className="bg-[#2D64C8] hover:bg-[#2D64C8]/90 hover:cursor-pointer h-11 font-semibold text-sm"
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

        {/* Resend */}
        <FieldDescription className="text-left text-[#B0BDD0] text-sm flex items-center gap-1.5">
          <span>Resend code in</span>
          {cooldown > 0 ? (
            <span className="text-[#2D64C8] font-medium">{cooldown}s</span>
          ) : (
            <button type="button" onClick={handleResend} className="text-[#2D64C8] font-medium hover:underline">
              Resend
            </button>
          )}
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}