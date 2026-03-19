"use client";
import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

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
  {
    id: 5,
    title: "Maintenance Issue Unassigned · Unit 7C, Riverside Block",
    description: "Plumbing issue · 3 days unassigned",
    action: "Assign",
  },
  {
    id: 6,
    title: "Maintenance Issue Unassigned · Unit 7C, Riverside Block",
    description: "Plumbing issue · 3 days unassigned",
    action: "Assign",
  },
  {
    id: 7,
    title: "Maintenance Issue Unassigned · Unit 7C, Riverside Block",
    description: "Plumbing issue · 3 days unassigned",
    action: "Assign",
  },
];

const totalAlerts = 12;

export function AlertsSection() {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleAction = (id: number) => {
    setLoadingId(id);
    // Simulate async action — replace with your real call
    setTimeout(() => setLoadingId(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold">Alerts</p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {totalAlerts} items requiring your attention · Showing {alerts.length}
          </p>
        </div>
        <Button variant="outline" className="gap-1.5 text-xs font-semibold h-8 px-3 w-36 cursor-pointer">
          View All Alerts <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col overflow-y-auto max-h-64">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between py-2 hover:bg-muted rounded-md px-1 -mx-1 transition-colors ${
              index !== alerts.length - 1 ? "border-b" : ""
            }`}
          >
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.description}</p>
            </div>
            <Button
              variant="outline"
              className="text-xs font-semibold h-8 px-3 shrink-0 ml-4 w-36 cursor-pointer"
              disabled={loadingId === alert.id}
              onClick={() => handleAction(alert.id)}
            >
              {loadingId === alert.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                alert.action
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}