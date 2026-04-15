// ─── Step 1: Basic Details ────────────────────────────────────────────────────
type Step1Data = {
  managerId: string;
  propertyName: string;
  description: string;
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep1(data: Step1Data): FieldErrors<Step1Data> {
  const errors: FieldErrors<Step1Data> = {};
  if (!data.managerId) errors.managerId = "Please select a property manager.";
  if (!data.propertyName.trim())
    errors.propertyName = "Property name is required.";
  return errors;
}

type FieldErrors<T> = Partial<Record<keyof T, string>>;



function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
export function Step1({
  data,
  onChange,
  errors,
}: {
  data: Step1Data;
  onChange: (d: Step1Data) => void;
  errors: FieldErrors<Step1Data>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-foreground">Basic Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Start with the core details of this property.
        </p>
      </div>

      <Field label="Property Manager" required error={errors.managerId}>
        <div className="flex items-center gap-1.5">
          <Select
            value={data.managerId}
            onValueChange={(v) => onChange({ ...data, managerId: v })}
          >
            <SelectTrigger
              className={`flex-1 h-8 text-xs border-border rounded-md focus:ring-0 focus-visible:ring-0 ${errors.managerId ? "border-red-400" : ""}`}
            >
              <SelectValue placeholder="Select a property manager" />
            </SelectTrigger>
            <SelectContent className="p-1 rounded-md">
              {PROPERTY_MANAGERS.map((pm) => (
                <SelectItem
                  key={pm.id}
                  value={pm.id}
                  className="text-xs cursor-pointer rounded-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{pm.name}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {pm.email}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {data.managerId && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...data, managerId: "" })}
              type="button"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </Field>

      <Field label="Property Name" required error={errors.propertyName}>
        <Input
          className={`h-8 text-xs border-border rounded-md focus-visible:ring-0 placeholder:text-muted-foreground placeholder:text-xs ${errors.propertyName ? "border-red-400" : ""}`}
          placeholder="e.g. Ridgeways Apartments"
          value={data.propertyName}
          onChange={(e) => onChange({ ...data, propertyName: e.target.value })}
        />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-0 resize-none min-h-[100px] placeholder:text-muted-foreground placeholder:text-xs"
          placeholder="Brief description of the property (optional)"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
        />
      </Field>
    </div>
  );
}