const ROLE_LABEL: Record<string, string> = {
  LANDLORD: "Landlord",
  PROPERTY_MANAGER: "Property Manager",
  TENANT: "Tenant",
};

type AccountMetaCardProps = {
  role: string;
  createdAt: string;
  isActive: boolean;
};

export function AccountMetaCard({ role, createdAt, isActive }: AccountMetaCardProps) {
  const memberSince = new Date(createdAt).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border bg-white p-4 flex flex-col gap-0">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Account
      </p>
      <div className="flex flex-col divide-y divide-border">
        <div className="flex items-center justify-between py-2.5 first:pt-0">
          <span className="text-xs text-muted-foreground">Role</span>
          <span className="text-xs font-medium text-[#2D64C8] bg-[#2D64C8]/10 px-2.5 py-0.5 rounded-full">
            {ROLE_LABEL[role] ?? role}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-muted-foreground">Member since</span>
          <span className="text-xs font-medium text-foreground">{memberSince}</span>
        </div>
        <div className="flex items-center justify-between py-2.5 last:pb-0">
          <span className="text-xs text-muted-foreground">Account status</span>
          <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-red-500"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}