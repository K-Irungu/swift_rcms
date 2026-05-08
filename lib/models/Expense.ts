import mongoose, { Schema, Document } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "Repairs & Maintenance",
  "Utilities",
  "Insurance",
  "Security",
  "Cleaning",
  "Management Fees",
  "Legal & Professional",
  "Other",
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface IExpense extends Document {
  propertyId:    mongoose.Types.ObjectId;
  category:      ExpenseCategory;
  description:   string;
  amount:        number;
  expenseDate:   Date;
  recordedBy:    mongoose.Types.ObjectId;
  maintenanceId?: mongoose.Types.ObjectId;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    propertyId:    { type: Schema.Types.ObjectId, ref: "Property", required: true },
    category:      { type: String, enum: EXPENSE_CATEGORIES, required: true },
    description:   { type: String, required: true, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    expenseDate:   { type: Date, required: true },
    recordedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    maintenanceId: { type: Schema.Types.ObjectId, ref: "Maintenance" },
  },
  { timestamps: true },
);

ExpenseSchema.index({ propertyId: 1, expenseDate: -1 });
ExpenseSchema.index({ propertyId: 1, category: 1 });

export const Expense =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
