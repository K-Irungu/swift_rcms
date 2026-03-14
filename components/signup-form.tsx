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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const firstName = (form.elements.namedItem("firstName") as HTMLInputElement)
      .value;
    const lastName = (form.elements.namedItem("lastName") as HTMLInputElement)
      .value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: replace with signUp(firstName, lastName, email, phone)
      toast.success("OTP sent to your phone.");
      router.push("/auth/verify-otp?mode=signup");
    } catch (error) {
      toast.error("Sign up failed. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName =
    "bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20";
  const labelClassName = "text-[#D6DDE8] text-sm font-medium";

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-start gap-4 text-left">
          <h1 className="text-3xl font-bold text-white">Create an Account</h1>
          <p className="text-base text-[#B0BDD0]">
            Enter your details to get started
          </p>
        </div>

        {/* Fields */}
        <div className="flex gap-4">
          <Field className="flex-1">
            <FieldLabel htmlFor="firstName" className={labelClassName}>
              First Name
            </FieldLabel>
            <Input
              id="firstName"
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
              type="text"
              placeholder="Doe"
              required
              disabled={isLoading}
              className={inputClassName}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="email" className={labelClassName}>
            Email Address
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            required
            disabled={isLoading}
            className={inputClassName}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="phone" className={labelClassName}>
            Phone Number
          </FieldLabel>
          <Input
            id="phone"
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
            className="bg-[#2D64C8] hover:bg-[#2D64C8]/90 hover:cursor-pointer h-11 font-semibold text-sm"
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

        {/* Footer */}
        <FieldDescription className="text-left text-[#B0BDD0] text-sm flex items-center justify-between gap-1.5">
          <span>Already have an account?</span>
          <a
            href="/auth/login"
            className="no-underline! ml-auto text-sm text-[#2D64C8] hover:text-[#2D64C8]/90! hover:underline!"
          >
            Log in
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
