import mongoose, { Schema, Document } from 'mongoose'

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID    = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface IInvoice extends Document {
  leaseId:       mongoose.Types.ObjectId
  invoiceDate:   Date
  dueDate:       Date
  amount:        number
  lateFee:       number
  billingPeriod: Date
  status:        InvoiceStatus
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    leaseId:       { type: Schema.Types.ObjectId, ref: 'Lease', required: true },
    invoiceDate:   { type: Date, required: true },
    dueDate:       { type: Date, required: true },
    amount:        { type: Number, required: true },
    lateFee:       { type: Number, default: 0 },
    billingPeriod: { type: Date, required: true },
    status:        { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.PENDING },
  },
  { timestamps: true }
)

InvoiceSchema.index({ leaseId: 1 })
InvoiceSchema.index({ status: 1, dueDate: 1 })

export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema)