"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClassName =
  "bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20";
const labelClassName = "text-[#D6DDE8] text-sm font-medium";

// ─── Component ────────────────────────────────────────────────────────────────

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Sends a password reset OTP to the user's email address.
  // On success, redirects to OTP verification with email as a query param.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Extract email from form
      const formData = new FormData(e.currentTarget);
      const email    = formData.get("email") as string;

      // Step 2: Send reset OTP request to the API
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP");
      }

      // Step 3: Redirect to OTP verification with email as query param
      toast.success("OTP sent to your email.");

      const params = new URLSearchParams({ mode: "reset", email });
      router.push(`/auth/verify-otp?${params.toString()}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send OTP. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
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
            href="/auth/login"
            className="flex items-center gap-2 text-sm text-[#B0BDD0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
          <p className="text-base text-[#B0BDD0]">
            Enter your registered email address and we&apos;ll send you a code to
            reset your password
          </p>
        </div>

        {/* Email */}
        <Field>
          <FieldLabel htmlFor="email" className={labelClassName}>
            Email Address
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            disabled={isLoading}
            className={inputClassName}
          />
        </Field>

        {/* Submit */}
        <Field>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2D64C8] hover:bg-[#2D64C8]/90 hover:cursor-pointer h-11 font-semibold text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Send OTP"
            )}
          </Button>
        </Field>

      </FieldGroup>
    </form>
  );
}