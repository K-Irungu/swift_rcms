"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPasswordStrength } from "@/lib/password-strength";

// ─── Component ────────────────────────────────────────────────────────────────

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword]         = useState("");

  const router       = useRouter();
  const searchParams = useSearchParams();

  // Email is passed forward from the verify-otp page
  const email = searchParams.get("email") || "";

  const strength = getPasswordStrength(password);

  // Submits the new password to the API and redirects to login on success
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Send new password and email to the API
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password, email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password");
      }

      // Step 2: Redirect to login on success
      toast.success("Password reset successfully. Please log in.");
      router.push("/auth/login");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reset password. Please try again.";
      toast.error(message);
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form className={cn("flex flex-col gap-5", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>

        {/* Header */}
        <div className="flex flex-col items-start gap-4 text-left">
          <Link
            href={`/auth/verify-otp?mode=reset&email=${encodeURIComponent(email)}`}
            className="flex items-center gap-2 text-sm text-[#B0BDD0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-base text-[#B0BDD0]">
            Choose a new strong password for your account
          </p>
        </div>

        {/* Password input with show/hide toggle */}
        <Field>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your new password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0BDD0]/60 hover:text-[#B0BDD0] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password strength indicator — only shown once the user starts typing */}
          {password.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: i < strength.score ? strength.color : "rgba(176, 189, 208, 0.15)",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium transition-colors" style={{ color: strength.color }}>
                  {strength.label}
                </p>
                {strength.feedback.length > 0 && (
                  <p className="text-xs text-[#B0BDD0]/60">{strength.feedback[0]}</p>
                )}
              </div>
            </div>
          )}
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
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </Field>

      </FieldGroup>
    </form>
  );
}