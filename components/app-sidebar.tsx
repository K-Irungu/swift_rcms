"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  GalleryVerticalEndIcon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  LayoutDashboard,
  ReceiptIcon,
  Building,
  KeyIcon,
  UsersIcon,
  CircleDollarSignIcon,
  KeyRound,
  BadgeCheck,
  Wrench,
  Receipt,
  FileText,
  Wallet,
  AlertCircle,
  ClockFading,
  MessageSquare,
  Settings,
} from "lucide-react";

// This is sample data.
const data = {
  user: {
    name: "Kevin Irungu",
    email: "kirungu@swift.co.ke",
    avatar: "/images/profile-pic.webp",
  },
  navGroups: [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboard /> },
      ],
    },
    {
      label: "Property Management",
      items: [
        {
          title: "Properties",
          url: "/properties",
          icon: <Building />,
          hasDropdown: true,
          items: [
            { title: "All Properties", url: "/properties" },
            { title: "Add New", url: "/properties" },
          ],
        },

        {
          title: "Units",
          url: "/units",
          icon: <KeyRound />,
          hasDropdown: true,
          items: [
            { title: "All Units", url: "/units" },
            { title: "Add New", url: "/units" },
          ],
        },
      ],
    },
    {
      label: "Tenant Management",
      items: [
        {
          title: "Tenants",
          url: "/tenants",
          icon: <UsersIcon />,
          hasDropdown: true,
          items: [
            {
              title: "All Tenants",
              url: "/tenants",
            },
            {
              title: "Add New",
              url: "/tenants",
            },
          ],
        },
      ],
    },
    {
      label: "Property Operations",
      items: [
        {
          title: "Approvals",
          url: "/approvals",
          icon: <BadgeCheck />,
          hasDropdown: true,
          items: [
            { title: "Pending Approvals", url: "/approvals" },
            { title: "Complete Approvals", url: "/approvals" },
          ],
        },
        {
          title: "Maintenance",
          url: "/maintenance",
          icon: <Wrench />,
          hasDropdown: true,
          items: [
            { title: "All Records", url: "/maintenance" },
            { title: "Add New", url: "/maintenance" },
          ],
        },
      ],
    },
    {
      label: "Finance",
      items: [
        {
          title: "Payments",
          url: "/payments",
          icon: <CircleDollarSignIcon />,
          hasDropdown: true,
          items: [
            { title: "All Payments", url: "/payments" },
            { title: "Add New", url: "/payments" },
            // { title: "Rent", url: "/payments/rent" },
            // { title: "Rent Deposits", url: "/payments/rent-deposits" },
            // { title: "Utilities", url: "/payments/utilities" },
            // { title: "Service Charges", url: "/payments/service-charges" },
          ],
        },
        {
          title: "Billing",
          url: "/billing",
          icon: <ClockFading />,
          hasDropdown: true,
          items: [
            { title: "All Bills", url: "/billing" },
            { title: "Add New", url: "/billing" },
          ],
        },
        {
          title: "Invoices",
          url: "/invoices",
          icon: <FileText />,
        },
        {
          title: "Expenses",
          url: "/expenses",
          icon: <Wallet />,
          hasDropdown: true,
          items: [
            { title: "All Expenses", url: "/expenses" },
            { title: "Add New", url: "/expenses" },
          ],
        },
        {
          title: "Arrears",
          url: "/arrears",
          icon: <AlertCircle />,
        },
      ],
    },

    {
      label: "Communication",
      items: [
        {
          title: "Messaging",
          url: "/messaging",
          icon: <MessageSquare />,
          hasDropdown: true,
          items: [
            { title: "All Messages", url: "/messaging" },
            { title: "Create New Message", url: "/messaging" },
          ],
        },
      ],
    },

    {
      label: "Administration",
      items: [
        {
          title: "Settings",
          url: "/settings",
          icon: <Settings />,
          hasDropdown: true,
          items: [
            { title: "Profile", url: "/settings" },
            { title: "Subscription", url: "/settings" },
            { title: "Notifications", url: "/settings" },
            // { title: "Integrations", url: "/settings/integrations" },
            // { title: "Delete Account", url: "/settings/delete" },
          ],
        },
      ],
    },
  ],

  projects: [
    // {
    //   name: "Design Engineering",
    //   url: "#",
    //   icon: <FrameIcon />,
    // },
    // {
    //   name: "Sales & Marketing",
    //   url: "#",
    //   icon: <PieChartIcon />,
    // },
    // {
    //   name: "Travel",
    //   url: "#",
    //   icon: <MapIcon />,
    // },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="px-4">
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="flex text-xs font-extrabold items-center justify-center border border-[#B0BDD0] text-primary-foreground w-8 h-8 shrink-0 [clip-path:polygon(0_0,100%_0,100%_100%,27%_100%,0_73%)]">
                  SR
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white text-sm tracking-tight">
                    swift
                  </span>
                  <span className="font-bold text-[#B0BDD0] text-sm tracking-tight">
                    rcms
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={data.navGroups} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
