import { GalleryVerticalEnd } from "lucide-react";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#0F1F3D]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex text-[24px] font-extrabold items-center justify-center border border-[#B0BDD0] text-primary-foreground w-[56px] h-[56px] [clip-path:polygon(0_0,100%_0,100%_100%,27%_100%,0_73%)]">
              SR
            </div>
            <div className="font-extrabold text-white text-[24px]">swift</div>
            <div className="font-extrabold text-[#B0BDD0] text-[24px]">
              rcms
            </div>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
