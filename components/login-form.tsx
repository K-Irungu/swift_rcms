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

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClassName =
  "bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20";
const labelClassName = "text-[#D6DDE8] text-sm font-medium";

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Submits credentials to the API and redirects to the dashboard on success
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Extract form values
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      // Step 2: Submit credentials to the API
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      // Step 3: Redirect to dashboard on success
      toast.success(`Welcome back, ${data.data.user.fullName}!`);
      router.push("/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.";
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
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-base text-[#B0BDD0]">
            Enter your details to access your account
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

        {/* Password */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password" className={labelClassName}>
              Password
            </FieldLabel>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[#2D64C8] hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
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
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </Field>

        {/* Register redirect */}
        <FieldDescription className="text-left text-[#B0BDD0] text-sm flex items-center justify-between gap-1.5">
          <span>Don&apos;t have an account?</span>

          <Link
            href="/auth/register"
            className="text-sm text-[#2D64C8] hover:underline [text-decoration:none] hover:text-[#2D64C8]!"
          >
            Register
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
