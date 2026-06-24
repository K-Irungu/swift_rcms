import { VerifyOtpForm } from "@/components/verifyotp-form";
import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getPendingRegistrationCookie, clearPendingRegistrationCookie } from "@/lib/utils/cookies";
import { authService } from "@/lib/services/auth.service";
// ─── Constants ────────────────────────────────────────────────────────────────

const LOGO_CLIP = "polygon(0 0,100% 0,100% 100%,27% 100%,0 73%)";

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

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Logo() {
  return (
    <a href="#" className="flex items-center gap-4 font-medium">
      <div
        className="flex text-xl font-extrabold items-center justify-center border border-[#B0BDD0] text-primary-foreground w-12 h-12"
        style={{ clipPath: LOGO_CLIP }}
      >
        SR
      </div>
      <div className="flex gap-1.5">
        <span className="font-extrabold text-white text-xl">swift</span>
        <span className="font-extrabold text-[#B0BDD0] text-xl">rcms</span>
      </div>
    </a>
  );
}

function Footer() {
  return (
    <div className="flex gap-4 justify-start text-sm text-[#B0BDD0]">
      <a href="#" className="hover:text-white transition-colors">
        Terms & Conditions
      </a>
      <span>·</span>
      <a href="#" className="hover:text-white transition-colors">
        Privacy Policy
      </a>
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="relative hidden lg:flex 2xl:hidden flex-col bg-[#1A2E54] py-20 pl-20 overflow-hidden gap-12">
      <div className="z-10">
        <h2 className="text-4xl font-extrabold text-white leading-tight tracking-[-0.8px]">
          Collect smarter. Manage better.
        </h2>
        <p className="mt-4 text-[#B0BDD0] text-base max-w-md">
          Oversee rent, tenants and payments all in one place anytime, anywhere.
        </p>
      </div>
      <div className="z-10 w-full h-full flex flex-col justify-center overflow-visible">
        <div
          className="z-10 flex-1 relative -rotate-3 rounded-l-xl border border-[#B0BDD0]/40 overflow-hidden -mr-5 max-h-[520px]"
          style={{ boxShadow: "0px 8px 32px 0px rgba(0,0,0,0.35)" }}
        >
          <Image
            src="/images/dashboard-preview.png"
            alt="Swift RCMS Dashboard Preview"
            fill
            quality={95}
            priority
            className="object-cover object-top-left"
          />
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#0F1F3D] 2xl:grid-cols-[1fr_auto_1fr]">
      <div className="hidden 2xl:block bg-[#0F1F3D]" />
      <div className="flex flex-col p-9 md:p-20 lg:col-span-1 w-full 2xl:max-w-xl 2xl:w-xl">
        <div className="flex flex-col flex-1 2xl:justify-center 2xl:gap-10">
          <Logo />
          <div className="flex flex-1 items-center justify-start 2xl:flex-none">
            <div className="w-full">{children}</div>
          </div>
          <Footer />
        </div>
      </div>
      <HeroPanel />
      <div className="hidden 2xl:block bg-[#0F1F3D]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const mode = resolvedSearchParams.mode ?? "login";

  if (mode === "register") {
    const pendingUser = await getPendingRegistrationCookie();

    // Cookie missing or expired — send back to register
    if (!pendingUser) redirect("/auth/register");
const remainingSeconds = await authService.getRegistrationTtl(pendingUser.email);

console.log("Remaining seconds for OTP:", remainingSeconds);
if (remainingSeconds <= 0) {
      // Redis is wiped, but cookie was stale! 
      // We must clear the cookie so they aren't stuck in a redirect loop.
      const syncResponse = NextResponse.redirect(new URL("/auth/register", "http://localhost:3000")); // Fallback URL builder
      await clearPendingRegistrationCookie(syncResponse);
      
      redirect("/auth/register");
    }


    return (
      <PageShell>
        <Suspense fallback={null}>
          <VerifyOtpForm
            mode={mode}
            maskedEmail={maskEmail(pendingUser.email)}
            maskedPhone={maskPhone(pendingUser.phoneNumber)}
            initialCooldownSeconds={remainingSeconds} // Guaranteed accurate and in-sync
          />
        </Suspense>
      </PageShell>
    );
  }

  // Login and reset flows — no cookie required
  return (
    <PageShell>
      <Suspense fallback={null}>
        <VerifyOtpForm mode={mode} />
      </Suspense>
    </PageShell>
  );
}
