import "../globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const user = {
  name: "Kevin Irungu",
  email: "kirungu@swift.co.ke",
  avatar: "/images/profile-pic.webp",
};


export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        
         <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  {/* Left side */}
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                      orientation="vertical"
                      className="mr-2 data-[orientation=vertical]:h-4 my-auto"
                    />
                    <BreadcrumbNav />
                  </div>
        
                  {/* Right side */}
                  <div className="flex items-center gap-2 px-4">
                    {/* Search — full input on md+, icon-only on mobile */}
                    <div className="relative hidden md:block">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        className="pl-8 h-8 w-44 text-sm bg-transparent border border-border rounded-md focus-visible:ring-[0.5px] focus-visible:ring-sidebar-ring"
                      />
                    </div>
                    {/* Mobile search icon only */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 hover:bg-muted/50 cursor-pointer"
                    >
                      <Search className="size-4 text-muted-foreground" />
                    </Button>
        
                    {/* Notifications */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-8 w-8 hover:bg-muted/50 cursor-pointer"
                    >
                      <Bell className="size-4 text-muted-foreground" />
                      <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-500" />
                    </Button>
        
                    {/* Separator — hide on mobile */}
                    <Separator
                      orientation="vertical"
                      className="h-4 my-auto hidden sm:block"
                    />
        
                    {/* User */}
                    <NavUser user={user} />
                  </div>
                </header>
        
                {/* <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                  <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="aspect-video rounded-xl bg-muted/50" />
                    <div className="aspect-video rounded-xl bg-muted/50" />
                    <div className="aspect-video rounded-xl bg-muted/50" />
                  </div>
                  <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
                </div> */}
                        {children}

              </SidebarInset>
            </SidebarProvider>
      
      

  );
}
