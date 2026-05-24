"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClientApiError } from "@/lib/utils/ClientApiError";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClassName =
  "bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20";

const labelClassName = "text-[#D6DDE8] text-sm font-medium";

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ─── Submit function ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        fullName: `${formData.get("firstName")} ${formData.get("lastName")}`,
        email: formData.get("email") as string,
        phoneNumber: formData.get("phone") as string,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const apiResponse = await res.json().catch(() => ({
        success: false,
        message: "Unexpected server response",
      }));

      if (!res.ok || !apiResponse.success) {
        throw new ClientApiError(
          apiResponse.message || "Failed to register",
          res.status,
        );
      }

      toast.success(apiResponse.message || "Check your email for next steps");

      router.push(`/auth/verify-otp?mode=register`);
    } catch (error: unknown) {
      if (error instanceof ClientApiError) {
        toast.error(error.message);
      } else {
        toast.error("Network error. Please check your connection.");
      }
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
        {/* Heading */}
        <div className="flex flex-col items-start gap-4 text-left">
          <h1 className="text-3xl font-bold text-white">Create an Account</h1>
          <p className="text-base text-[#B0BDD0]">
            Enter your details to get started
          </p>
        </div>

        {/* Name fields */}
        <div className="flex gap-4">
          <Field className="flex-1">
            <FieldLabel htmlFor="firstName" className={labelClassName}>
              First Name
            </FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="John"
              required
              disabled={isLoading}
              className={inputClassName}
            />
          </Field>
          <Field className="flex-1">
            <FieldLabel htmlFor="lastName" className={labelClassName}>
              Last Name
            </FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Doe"
              required
              disabled={isLoading}
              className={inputClassName}
            />
          </Field>
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

        {/* Phone */}
        <Field>
          <FieldLabel htmlFor="phone" className={labelClassName}>
            Phone Number
          </FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+254 700 000 000"
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
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </Field>

        {/* Login redirect */}
        <FieldDescription className="text-left text-[#B0BDD0] text-sm flex items-center justify-between gap-1.5">
          <span>Already have an account?</span>
          <Link
            href="/auth/login"
            className="ml-auto text-sm text-[#2D64C8] hover:underline hover:text-[#2D64C8]!"
          >
            Log in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
