"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "./_ui";
import { useProperty } from "./_hooks/UseProperty";
import { EditSheet } from "./_components/EditSheet";
import { TabStrip } from "./_components/TabStrip";
import { OverviewTab } from "./_components/tabs/OverviewTab";
import { UnitsTab } from "./_components/tabs/UnitsTab";
import { TenantsTab } from "./_components/tabs/TenantsTab";
import { ContactsTab } from "./_components/tabs/ContactsTab";
import { FinanceTab } from "./_components/tabs/FinanceTab";
import { MaintenanceTab } from "./_components/tabs/MaintenanceTab";
import type { TabKey } from "./_types";

export default function SinglePropertyPage() {
  const { id: slug } = useParams<{ id: string }>();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const { property, setProperty, units, setUnits, contacts, setContacts, loading, notFound } =
    useProperty(slug);

  const [activeTab,    setActiveTab]    = useState<TabKey>("overview");
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [tenantCount,  setTenantCount]  = useState(0);

  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  if (loading) return <PageSkeleton />;

  if (notFound || !property) {
    return (
      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full items-center justify-center gap-3 p-8">
        <Building2 className="size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">Property not found</p>
        <p className="text-xs text-muted-foreground">This property may have been removed.</p>
        <Button
          variant="outline"
          className="h-8 text-xs gap-1.5 mt-1 cursor-pointer"
          onClick={() => router.push("/properties/all-properties")}
        >
          <ArrowLeft className="size-3.5" /> Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <>
      <EditSheet
        open={sheetOpen}
        property={property}
        slug={slug}
        onClose={() => setSheetOpen(false)}
        onSaved={(updated) => setProperty(updated)}
      />

      <div className="flex flex-col bg-[#F0F4F8] min-h-full w-full">
        <TabStrip
          property={property}
          units={units}
          tenantCount={tenantCount}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onEdit={() => setSheetOpen(true)}
        />

        <div className="p-4">
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">
              <OverviewTab
                property={property}
                slug={slug}
                onPropertyUpdate={setProperty}
              />
              <ContactsTab
                slug={slug}
                property={property}
                contacts={contacts}
                setContacts={setContacts}
              />
            </div>
          )}
          {activeTab === "units" && (
            <UnitsTab
              property={property}
              units={units}
              slug={slug}
              onUnitUpdate={(updated) => setUnits((prev) => prev.map((u) => u._id === updated._id ? updated : u))}
            />
          )}
          {activeTab === "tenants" && (
            <TenantsTab slug={slug} onTenantCountChange={setTenantCount} />
          )}
          {activeTab === "finance" && <FinanceTab slug={slug} />}
          {activeTab === "maintenance" && <MaintenanceTab />}
        </div>
      </div>
    </>
  );
}
