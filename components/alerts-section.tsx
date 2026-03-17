// components/alerts-section.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type AlertAction = "Send Reminder" | "Contact Tenant" | "Assign" | "Review";

type Alert = {
  id: number;
  title: string;
  description: string;
  action: AlertAction;
};

const alerts: Alert[] = [
  {
    id: 1,
    title: "Rent Overdue · Unit 2B, Riverside Block",
    description: "KES 18,000 · 47 days unpaid",
    action: "Send Reminder",
  },
  {
    id: 2,
    title: "Rent Overdue · Unit 4B, Greenwood Apartments",
    description: "KES 12,500 · 31 days unpaid",
    action: "Send Reminder",
  },
  {
    id: 3,
    title: "Failed Payment · Unit 9A, Maplewood Estate",
    description: "KES 9,000 bounced · Today",
    action: "Contact Tenant",
  },
  {
    id: 4,
    title: "Maintenance Issue Unassigned · Unit 7C, Riverside Block",
    description: "Plumbing issue · 3 days unassigned",
    action: "Assign",
  },
];

const totalAlerts = 12;

export function AlertsSection() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between border-b pb-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">Alerts</p>
          <p className="text-xs uppercase font-extrabold tracking-[0.12em] text-muted-foreground/60">
            {totalAlerts} items requiring your attention · Showing{" "}
            {alerts.length}
          </p>
        </div>
        <Button variant="outline" className="gap-1.5 text-xs font-semibold h-8 px-3">
          View All Alerts <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between px-4 py-3 ${
              index !== alerts.length - 1 ? "border-b" : ""
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs text-muted-foreground">
                {alert.description}
              </p>
            </div>
            <Button
              variant="outline"
              className="text-xs font-semibold h-8 px-3 shrink-0 ml-4"
            >
              {alert.action}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}