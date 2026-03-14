// forgot-password-form.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: replace with sendPasswordResetOtp(phone)
      toast.success("OTP sent to your phone.");
      router.push("/auth/verify-otp?mode=reset");
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-5", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-start gap-4 text-left">
          <a href="/auth/login" className="flex items-center gap-2 text-sm text-[#B0BDD0] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </a>
          <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
          <p className="text-base text-[#B0BDD0]">
            Enter your registered phone number and we&apos;ll send you a code to reset your password
          </p>
        </div>

        {/* Field */}
        <Field>
          <FieldLabel htmlFor="phone" className="text-[#D6DDE8] text-sm font-medium">
            Phone Number
          </FieldLabel>
          <Input
            id="phone"
            type="tel"
            placeholder="+254 700 000 000"
            required
            disabled={isLoading}
            className="bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20"
          />
        </Field>

        {/* Submit */}
        <Field>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#2D64C8] hover:bg-[#2D64C8]/90 hover:cursor-pointer h-11 font-semibold text-sm"
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