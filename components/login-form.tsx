"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: replace with signIn(email, password)
      toast.success("Success. Verify OTP");
      router.push("/auth/verify-otp?mode=login");
    } catch (error) {
      toast.error("Login failed. Please try again.");
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
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-base text-[#B0BDD0]">Enter your details to access your account</p>
        </div>

        {/* Fields */}
        <Field>
          <FieldLabel htmlFor="email" className="text-[#D6DDE8] text-sm font-medium">
            Email Address
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            required
            disabled={isLoading}
            className="bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] placeholder:text-[#B0BDD0]/40 h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20"
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password" className="text-[#D6DDE8] text-sm font-medium">
              Password
            </FieldLabel>
            <a href="/auth/forgot-password" className="ml-auto text-sm text-[#2D64C8] hover:text-[#2D64C8]/90! hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            required
            disabled={isLoading}
            className="bg-white/5 border-[#B0BDD0]/22 text-[#B0BDD0] h-10 focus-visible:border-[#2D64C8] focus-visible:ring-[#2D64C8]/20"
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
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </Field>

        {/* Footer */}
        <FieldDescription className="text-left text-[#B0BDD0] text-sm flex items-center justify-between gap-1.5">
          <span>Don&apos;t have an account?</span>
          <a href="/auth/signup" className="no-underline! ml-auto text-sm text-[#2D64C8] hover:text-[#2D64C8]/90! hover:underline!">
            Sign up
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}