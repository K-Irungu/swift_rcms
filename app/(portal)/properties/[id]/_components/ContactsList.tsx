import { Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact } from "../_types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  contacts: Contact[];
  isFormOpen: boolean;
  onDelete: (id: string) => void;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { label: "Role",  width: "w-[30%]" },
  { label: "Name",  width: "w-[25%]" },
  { label: "Phone", width: "w-[35%]" },
  { label: "",      width: "w-[10%]" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactsList({ contacts, isFormOpen, onDelete }: Props) {

  // Empty state — suppressed while the add form is open
  if (contacts.length === 0 && !isFormOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-1.5">
        <Phone className="size-5 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground font-medium">No contacts added yet.</p>
        <p className="text-[11px] text-muted-foreground/70">
          Add caretakers, security, or other on-site contacts.
        </p>
      </div>
    );
  }

  // No table if list is empty and form is open
  if (contacts.length === 0) return null;

  // Contacts table
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table style={{ tableLayout: "fixed", width: "100%" }}>

        {/* Header */}
        <TableHeader className="bg-muted/50">
          <TableRow>
            {COLUMNS.map(({ label, width }) => (
              <TableHead
                key={label}
                className={`text-xs font-semibold text-muted-foreground tracking-wide ${width}`}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* Rows */}
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c._id} className="hover:bg-muted/40 transition-colors">
              <TableCell className="text-xs font-medium">{c.role}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{c.name}</TableCell>
              <TableCell className="text-xs">
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="text-[#2D64C8] hover:underline flex items-center gap-1 w-fit"
                  >
                    <Phone className="size-3" />
                    {c.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={() => onDelete(c._id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

      </Table>
    </div>
  );
}
