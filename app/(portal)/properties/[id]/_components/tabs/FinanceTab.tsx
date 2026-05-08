"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Loader2,
  DollarSign, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Home, Users, Droplets, CreditCard, FileText, Plus, Trash2,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { BillingTab } from "./BillingTab";

// ─── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  "Repairs & Maintenance",
  "Utilities",
  "Insurance",
  "Security",
  "Cleaning",
  "Management Fees",
  "Legal & Professional",
  "Other",
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// ─── Types ─────────────────────────────────────────────────────────────────────

type RentRollEntry = {
  unitId:      string;
  unitNumber:  string;
  tenantName:  string | null;
  monthlyRent: number;
  amountPaid:  number;
  balance:     number;
  status:      "PAID" | "PARTIAL" | "UNPAID" | "VACANT";
  paymentDate: string | null;
};

type WaterRow = {
  _id:         string;
  unitNumber:  string;
  tenantName:  string | null;
  consumption: number;
  rateUsed:    number;
  amount:      number;
  readingDate: string;
  photoUrl:    string | null;
};

type ExpenseRow = {
  _id:         string;
  category:    ExpenseCategory;
  description: string;
  amount:      number;
  expenseDate: string;
};

type LedgerRow = {
  _id:             string;
  paymentDate:     string;
  paymentForMonth: string;
  tenantName:      string | null;
  unitNumber:      string;
  amount:          number;
  paymentMethod:   string;
  transactionRef:  string;
};

type Summary = {
  expectedRent:    number;
  collectedRent:   number;
  outstandingRent: number;
  collectionRate:  number;
  totalExpenses:   number;
  netIncome:       number;
  totalUnits:      number;
  occupiedUnits:   number;
  vacantUnits:     number;
};

type FinanceData = {
  month:              string;
  summary:            Summary;
  rentRoll:           RentRollEntry[];
  waterSummary:       { totalBilled: number; unitsRead: number; avgConsumption: number };
  waterReadings:      WaterRow[];
  expenses:           ExpenseRow[];
  expenseByCategory:  Record<string, number>;
  ledger:             LedgerRow[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtKES(n: number) {
  return `KES ${Math.abs(n).toLocaleString("en-KE")}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function monthLabel(ym: string) {
  return new Date(ym + "-02").toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: 1 | -1) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function collectionLabel(rate: number) {
  if (rate === 100) return "Full collection";
  if (rate >= 90)   return "Strong";
  if (rate >= 70)   return "Moderate";
  if (rate >= 50)   return "Needs attention";
  return "Critical";
}

// ─── Status config ─────────────────────────────────────────────────────────────

const RENT_STATUS_META = {
  PAID:    { label: "Paid",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PARTIAL: { label: "Partial", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  UNPAID:  { label: "Unpaid",  cls: "bg-red-50 text-red-700 border-red-200" },
  VACANT:  { label: "Vacant",  cls: "bg-muted text-muted-foreground border-border" },
} as const;

const METHOD_LABELS: Record<string, string> = {
  MPESA: "M-Pesa", BANK_TRANSFER: "Bank Transfer", CASH: "Cash",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Repairs & Maintenance": "bg-orange-50 text-orange-700 border-orange-200",
  "Utilities":             "bg-blue-50 text-blue-700 border-blue-200",
  "Insurance":             "bg-purple-50 text-purple-700 border-purple-200",
  "Security":              "bg-slate-50 text-slate-700 border-slate-200",
  "Cleaning":              "bg-teal-50 text-teal-700 border-teal-200",
  "Management Fees":       "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Legal & Professional":  "bg-rose-50 text-rose-700 border-rose-200",
  "Other":                 "bg-muted text-muted-foreground border-border",
};

// ─── Main component ────────────────────────────────────────────────────────────

type Props = { slug: string };

export function FinanceTab({ slug }: Props) {
  const [month,   setMonth]   = useState(currentMonthISO);
  const [data,    setData]    = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/properties/${slug}/finance?month=${m}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load finance data");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(month); }, [month, fetchData]);

  function handleExpenseAdded(expense: ExpenseRow) {
    setData((prev) => {
      if (!prev) return prev;
      const expenses        = [expense, ...prev.expenses];
      const totalExpenses   = prev.summary.totalExpenses + expense.amount;
      const netIncome       = prev.summary.collectedRent - totalExpenses;
      const expenseByCategory = { ...prev.expenseByCategory };
      expenseByCategory[expense.category] = (expenseByCategory[expense.category] ?? 0) + expense.amount;
      return {
        ...prev,
        expenses,
        expenseByCategory,
        summary: { ...prev.summary, totalExpenses, netIncome },
      };
    });
  }

  function handleExpenseDeleted(expenseId: string) {
    setData((prev) => {
      if (!prev) return prev;
      const removed       = prev.expenses.find((e) => e._id === expenseId);
      if (!removed) return prev;
      const expenses      = prev.expenses.filter((e) => e._id !== expenseId);
      const totalExpenses = prev.summary.totalExpenses - removed.amount;
      const netIncome     = prev.summary.collectedRent - totalExpenses;
      const expenseByCategory = { ...prev.expenseByCategory };
      expenseByCategory[removed.category] = Math.max(0, (expenseByCategory[removed.category] ?? 0) - removed.amount);
      return {
        ...prev,
        expenses,
        expenseByCategory,
        summary: { ...prev.summary, totalExpenses, netIncome },
      };
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, rentRoll, waterSummary, waterReadings, expenses, expenseByCategory, ledger } = data;
  const behindCount = rentRoll.filter((r) => r.status === "UNPAID" || r.status === "PARTIAL").length;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Month navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="p-1.5 rounded hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold w-36 text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= currentMonthISO()}
            className="p-1.5 rounded hover:bg-muted transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Home className="size-3" />
            {summary.occupiedUnits}/{summary.totalUnits} occupied
          </span>
          {summary.vacantUnits > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Users className="size-3" />
              {summary.vacantUnits} vacant
            </span>
          )}
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────────── */}
      {/* Row 1: Income */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Expected Rent"
          value={fmtKES(summary.expectedRent)}
          sub={`${summary.occupiedUnits} occupied unit${summary.occupiedUnits !== 1 ? "s" : ""}`}
          icon={<DollarSign className="size-3.5 text-[#2D64C8]" />}
          iconBg="bg-[#2D64C8]/10"
        />
        <SummaryCard
          label="Rent Collected"
          value={fmtKES(summary.collectedRent)}
          sub={`${summary.collectionRate}% — ${collectionLabel(summary.collectionRate)}`}
          icon={<CheckCircle2 className="size-3.5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          valueColor="text-emerald-700"
        />
        <SummaryCard
          label="Outstanding"
          value={fmtKES(summary.outstandingRent)}
          sub={behindCount > 0 ? `${behindCount} unit${behindCount !== 1 ? "s" : ""} behind` : "All clear"}
          icon={<AlertCircle className="size-3.5 text-red-500" />}
          iconBg="bg-red-50"
          valueColor={summary.outstandingRent > 0 ? "text-red-600" : "text-foreground"}
        />
        <SummaryCard
          label="Collection Rate"
          value={`${summary.collectionRate}%`}
          sub={collectionLabel(summary.collectionRate)}
          icon={<TrendingUp className="size-3.5 text-amber-500" />}
          iconBg="bg-amber-50"
          valueColor={
            summary.collectionRate >= 90 ? "text-emerald-700" :
            summary.collectionRate >= 70 ? "text-amber-600" :
            "text-red-600"
          }
        />
      </div>

      {/* Row 2: Bottom line */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Income"
          value={fmtKES(summary.collectedRent)}
          sub="Rent collected this month"
          icon={<ArrowUpRight className="size-3.5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          valueColor="text-emerald-700"
        />
        <SummaryCard
          label="Total Expenses"
          value={fmtKES(summary.totalExpenses)}
          sub={`${expenses.length} expense${expenses.length !== 1 ? "s" : ""} recorded`}
          icon={<ArrowDownRight className="size-3.5 text-red-500" />}
          iconBg="bg-red-50"
          valueColor={summary.totalExpenses > 0 ? "text-red-600" : "text-foreground"}
        />
        <div className={`rounded-lg border p-4 flex flex-col gap-2 ${
          summary.netIncome >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Net Income</span>
            {summary.netIncome >= 0
              ? <TrendingUp className="size-4 text-emerald-600" />
              : <TrendingDown className="size-4 text-red-600" />
            }
          </div>
          <p className={`text-lg font-bold leading-tight ${
            summary.netIncome >= 0 ? "text-emerald-700" : "text-red-600"
          }`}>
            {summary.netIncome < 0 ? "−" : ""}{fmtKES(summary.netIncome)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Income minus expenses — {monthLabel(month)}
          </p>
        </div>
      </div>

      {/* ── Rent Roll ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold">Rent Roll</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Payment status per unit — {monthLabel(month)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(["PAID", "PARTIAL", "UNPAID"] as const).map((s) => {
              const n = rentRoll.filter((r) => r.status === s).length;
              if (n === 0) return null;
              const { label, cls } = RENT_STATUS_META[s];
              return (
                <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
                  {n} {label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                {["Unit", "Tenant", "Monthly Rent", "Status", "Paid", "Balance", "Payment Date"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rentRoll.map((r) => {
                const { label, cls } = RENT_STATUS_META[r.status];
                return (
                  <tr key={r.unitId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-semibold">{r.unitNumber}</td>
                    <td className="py-3 px-4">
                      {r.tenantName ?? <span className="text-muted-foreground/50 italic text-[11px]">Vacant</span>}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-medium">
                      {r.status === "VACANT" ? "—" : fmtKES(r.monthlyRent)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
                        {label}
                      </span>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-emerald-700 font-medium">
                      {r.amountPaid > 0 ? fmtKES(r.amountPaid) : "—"}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-red-600 font-medium">
                      {r.balance > 0 ? fmtKES(r.balance) : "—"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{fmtDate(r.paymentDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Expenses ──────────────────────────────────────────────────────────── */}
      <ExpensesSection
        slug={slug}
        month={month}
        expenses={expenses}
        expenseByCategory={expenseByCategory}
        onAdded={handleExpenseAdded}
        onDeleted={handleExpenseDeleted}
      />

      {/* ── Water Billing ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <Droplets className="size-3.5 text-[#2D64C8]" />
            Water Billing
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Meter readings and charges — {monthLabel(month)}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
          <WaterStatCell label="Total Billed"     value={fmtKES(waterSummary.totalBilled)} />
          <WaterStatCell label="Units Read"       value={`${waterSummary.unitsRead} unit${waterSummary.unitsRead !== 1 ? "s" : ""}`} />
          <WaterStatCell label="Avg. Consumption" value={`${waterSummary.avgConsumption} units`} />
        </div>
        {waterReadings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5">
            <Droplets className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No readings recorded for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Unit", "Tenant", "Consumption", "Rate/Unit", "Amount", "Date", ""].map((h, i) => (
                    <th key={i} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {waterReadings.map((r) => (
                  <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-semibold">{r.unitNumber}</td>
                    <td className="py-3 px-4">
                      {r.tenantName ?? <span className="text-muted-foreground/50 italic text-[11px]">—</span>}
                    </td>
                    <td className="py-3 px-4 tabular-nums">{r.consumption} units</td>
                    <td className="py-3 px-4 tabular-nums text-muted-foreground">KES {r.rateUsed}</td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-[#2D64C8]">{fmtKES(r.amount)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{fmtDate(r.readingDate)}</td>
                    <td className="py-3 px-4">
                      {r.photoUrl ? (
                        <a href={r.photoUrl} target="_blank" rel="noreferrer"
                          className="text-[#2D64C8] hover:underline font-medium text-[11px]">
                          View photo
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Water Rate Config ─────────────────────────────────────────────────── */}
      <BillingTab slug={slug} />

      {/* ── Payment Ledger ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <CreditCard className="size-3.5 text-muted-foreground" />
            Payment Ledger
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            All rent payments received across this property
          </p>
        </div>
        {ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5">
            <FileText className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Date Paid", "Tenant", "Unit", "For Month", "Amount", "Method", "Reference"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledger.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{fmtDate(p.paymentDate)}</td>
                    <td className="py-3 px-4 font-medium">{p.tenantName ?? "—"}</td>
                    <td className="py-3 px-4 font-semibold">{p.unitNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(p.paymentForMonth).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-emerald-700">
                      {fmtKES(p.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                        {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {p.transactionRef}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Expenses section ──────────────────────────────────────────────────────────

function ExpensesSection({
  slug, month, expenses, expenseByCategory, onAdded, onDeleted,
}: {
  slug:               string;
  month:              string;
  expenses:           ExpenseRow[];
  expenseByCategory:  Record<string, number>;
  onAdded:            (e: ExpenseRow) => void;
  onDeleted:          (id: string) => void;
}) {
  const [showForm,    setShowForm]    = useState(false);
  const [category,    setCategory]    = useState<ExpenseCategory>("Repairs & Maintenance");
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [dateInput,   setDateInput]   = useState(todayISO());
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  async function handleAdd() {
    const amt = Number(amount);
    if (!description.trim())              { toast.error("Description is required."); return; }
    if (!amount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount."); return; }

    setSaving(true);
    try {
      const res  = await fetch(`/api/properties/${slug}/expenses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ category, description: description.trim(), amount: amt, expenseDate: dateInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to log expense");
      onAdded(json.data);
      setDescription(""); setAmount(""); setDateInput(todayISO());
      setShowForm(false);
      toast.success("Expense logged.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/properties/${slug}/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(id);
      toast.success("Expense removed.");
    } catch {
      toast.error("Failed to remove expense.");
    } finally {
      setDeleting(null);
    }
  }

  // Category breakdown — only categories with values > 0
  const breakdown = Object.entries(expenseByCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <ArrowDownRight className="size-3.5 text-red-500" />
            Expenses
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Property costs recorded — {new Date(month + "-02").toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-7 text-[11px] gap-1 px-2.5 cursor-pointer"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="size-3" />
          Log Expense
        </Button>
      </div>

      {/* Add expense form */}
      {showForm && (
        <div className="px-4 py-4 border-b bg-muted/20">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Category <span className="text-red-500">*</span></label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger className="h-8 text-xs w-48 focus:ring-0 focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs cursor-pointer">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-40">
              <label className="text-[11px] font-medium text-muted-foreground">Description <span className="text-red-500">*</span></label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Replaced gate motor"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Amount (KES) <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 12000"
                className="h-8 text-xs w-36"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                className="h-8 text-xs w-36"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-8 text-xs bg-[#2D64C8] hover:bg-[#2D64C8]/90"
                disabled={saving}
                onClick={handleAdd}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <div className="px-4 py-3 border-b flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-muted-foreground mr-1">Breakdown:</span>
          {breakdown.map(([cat, amt]) => (
            <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Other"]}`}>
              {cat} · KES {amt.toLocaleString("en-KE")}
            </span>
          ))}
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-1.5">
          <FileText className="size-5 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No expenses logged for this period.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Category", "Description", "Amount", ""].map((h, i) => (
                    <th key={i} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-[11px] border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((e) => (
                  <tr key={e._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{fmtDate(e.expenseDate)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS["Other"]}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground max-w-64 truncate">{e.description}</td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-red-600 whitespace-nowrap">
                      {fmtKES(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(e._id)}
                        disabled={deleting === e._id}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                        title="Remove expense"
                      >
                        {deleting === e._id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <Trash2 className="size-3.5" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total footer */}
          <div className="px-4 py-3 border-t bg-muted/20 flex justify-end">
            <span className="text-xs font-semibold text-red-600">
              Total: {fmtKES(totalExpenses)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon, iconBg, valueColor = "text-foreground",
}: {
  label:       string;
  value:       string;
  sub:         string;
  icon:        React.ReactNode;
  iconBg:      string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`p-1.5 rounded-md ${iconBg}`}>{icon}</span>
      </div>
      <p className={`text-lg font-bold leading-tight ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function WaterStatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
