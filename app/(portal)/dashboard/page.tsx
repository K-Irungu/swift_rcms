
import { SectionCards } from "@/components/section-cards";
import { ArrearsBanner } from "@/components/arrears-banner";
import { OccupancyCard } from "@/components/occupancy-card";
import { CollectionRate } from "@/components/collection-rate";
import { AlertsSection } from "@/components/alerts-section";

export default function Dashboard() {
  return (
    <div className="flex flex-1 flex-col bg-[#F0F4F8]">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 ">
          <SectionCards />
          <ArrearsBanner />
          <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2">
            <CollectionRate />
            <OccupancyCard />
          </div>
          <AlertsSection />
        </div>
      </div>
    </div>
  );
}
