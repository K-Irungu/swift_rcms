"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "./_ui";
import { useProperty } from "./_hooks/UseProperty";
import { EditSheet } from "./_components/EditSheet";
import { TabStrip } from "./_components/TabStrip";
import { OverviewTab } from "./_components/tabs/OverviewTab";
import { UnitsTab } from "./_components/tabs/UnitsTab";
import { FinancialsTab } from "./_components/tabs/FinancialsTab";
import { MaintenanceTab } from "./_components/tabs/MaintenanceTab";
import type { TabKey } from "./_types";

export default function SinglePropertyPage() {
  const { id: slug } = useParams<{ id: string }>();
  const router = useRouter();

  const { property, setProperty, units, contacts, setContacts, loading, notFound } =
    useProperty(slug);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sheetOpen, setSheetOpen] = useState(false);

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
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onEdit={() => setSheetOpen(true)}
        />

        <div className="p-4">
          {activeTab === "overview" && (
            <OverviewTab
              property={property}
              units={units}
              contacts={contacts}
              setContacts={setContacts}
              slug={slug}
              onPropertyUpdate={setProperty}
            />
          )}
          {activeTab === "units" && (
            <UnitsTab property={property} units={units} slug={slug} />
          )}
          {activeTab === "financials" && <FinancialsTab />}
          {activeTab === "maintenance" && <MaintenanceTab />}
        </div>
      </div>
    </>
  );
}
