"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/auth-shell";

type InviteDetails = {
  propertyName: string;
  landlordName: string;
  managerName: string;
  managerEmail: string;
  expiresAt: string;
};

type PageState = "loading" | "ready" | "accepting" | "accepted" | "error";

function Footer() {
  return (
    <div className="flex gap-4 justify-start text-sm text-[#B0BDD0]">
      <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
      <span>·</span>
      <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
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
            sizes="(min-width: 1024px) 50vw, 100vw"
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

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>("loading");
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const json = await res.json();
        if (!res.ok) {
          setErrorMessage(json.message || "This invitation is invalid or has expired.");
          setState("error");
          return;
        }
        setDetails(json.data);
        setState("ready");
      } catch {
        setErrorMessage("Failed to load invitation. Please try again.");
        setState("error");
      }
    }
    fetchInvite();
  }, [token]);

  async function handleAccept() {
    setState("accepting");
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const json = await res.json();

      if (res.status === 401) {
        router.push(`/auth/login?returnUrl=/invite/${token}`);
        return;
      }

      if (!res.ok) {
        setErrorMessage(json.message || "Failed to accept invitation.");
        setState("error");
        return;
      }

      setState("accepted");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="grid min-h-svh  bg-[#0F1F3D] justify-center ">



      {/* Form panel */}
      <div className="flex flex-col p-9 md:p-20 max-w-xl   ">
        <div className="flex flex-col flex-1 2xl:justify-center 2xl:gap-10">
          <Logo />

          <div className="flex flex-1 items-center justify-start 2xl:flex-none">
            <div className="w-full">

              {/* Loading */}
              {state === "loading" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="size-6 text-[#2D64C8] animate-spin" />
                  <p className="text-sm text-[#B0BDD0]">Loading invitation…</p>
                </div>
              )}

              {/* Ready */}
              {state === "ready" && details && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1 ">
                    <h1 className="text-2xl font-extrabold text-white leading-tight tracking-[-0.4px]">
                      You have been invited
                    </h1>
                    <p className="text-[#B0BDD0] text-sm mt-1">
                      <span className="text-white font-medium">{details.landlordName}</span> has
                      invited you to manage{" "}
                      <span className="text-white font-medium">{details.propertyName}</span> on
                      Swift RCMS.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#B0BDD0]/20 bg-white/5 p-4 flex flex-col gap-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[#B0BDD0]">Property</span>
                      <span className="text-white font-medium">{details.propertyName}</span>
                    </div>
                    <div className="border-t border-[#B0BDD0]/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-[#B0BDD0]">Invited as</span>
                      <span className="text-white font-medium">{details.managerName}</span>
                    </div>
                    <div className="border-t border-[#B0BDD0]/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-[#B0BDD0]">Email</span>
                      <span className="text-white font-medium">{details.managerEmail}</span>
                    </div>
                    <div className="border-t border-[#B0BDD0]/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-[#B0BDD0]">Expires</span>
                      <span className="text-white font-medium">
                        {new Date(details.expiresAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-10 bg-[#2D64C8] hover:bg-[#2D64C8]/90 text-white font-semibold cursor-pointer"
                    onClick={handleAccept}
                  >
                    Accept Invitation
                  </Button>
                </div>
              )}

              {/* Accepting */}
              {state === "accepting" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="size-6 text-[#2D64C8] animate-spin" />
                  <p className="text-sm text-[#B0BDD0]">Accepting invitation…</p>
                </div>
              )}

              {/* Accepted */}
              {state === "accepted" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="size-5 text-green-400" />
                      <span className="text-green-400 text-sm font-semibold">Invitation accepted</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white leading-tight tracking-[-0.4px]">
                      All set!
                    </h1>
                    <p className="text-[#B0BDD0] text-sm mt-1">
                      You are now managing{" "}
                      <span className="text-white font-medium">{details?.propertyName}</span>.
                      Head to your dashboard to get started.
                    </p>
                  </div>
                  <Button
                    className="w-full h-10 bg-[#2D64C8] hover:bg-[#2D64C8]/90 text-white font-semibold cursor-pointer"
                    onClick={() => router.push("/")}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}

              {/* Error */}
              {state === "error" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="size-5 text-red-400" />
                      <span className="text-red-400 text-sm font-semibold">Invitation unavailable</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white leading-tight tracking-[-0.4px]">
                      Something went wrong
                    </h1>
                    <p className="text-[#B0BDD0] text-sm mt-1">{errorMessage}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-10 border-[#B0BDD0]/30 text-[#B0BDD0] hover:text-white hover:border-white cursor-pointer bg-transparent"
                    onClick={() => router.push("/")}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>



    </div>
  );
}
