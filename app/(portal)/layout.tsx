import "../globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { Separator } from "@/components/ui/separator";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavNotifications } from "@/components/nav-notifications";
import { getCurrentUser } from "@/lib/utils/auth";
import { redirect } from "next/navigation";

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Protect all dashboard routes — redirect to login if not authenticated
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <SidebarProvider className="overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">

          {/* Left side */}
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 cursor-pointer" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 my-auto"
            />
            <BreadcrumbNav />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 px-4">
            <NavNotifications />
            <NavUser user={{ name: user.fullName, email: user.email, avatar: "" }} />
          </div>

        </header>

        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}