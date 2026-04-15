import mongoose, { Schema, Document } from 'mongoose'

export enum PaymentMethod {
  MPESA         = 'MPESA',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH          = 'CASH',
}

export interface IPayment extends Document {
  leaseId:            mongoose.Types.ObjectId
  amount:             number
  paymentDate:        Date
  paymentMethod:      PaymentMethod
  transactionRef:     string
  paymentForMonth:    Date
  mpesaReceiptNumber?: string
}

const PaymentSchema = new Schema<IPayment>(
  {
    leaseId:            { type: Schema.Types.ObjectId, ref: 'Lease', required: true },
    amount:             { type: Number, required: true },
    paymentDate:        { type: Date, required: true, default: Date.now },
    paymentMethod:      { type: String, enum: Object.values(PaymentMethod), required: true },
    transactionRef:     { type: String, required: true, unique: true },
    paymentForMonth:    { type: Date, required: true },
    mpesaReceiptNumber: { type: String },
  },
  { timestamps: true }
)

PaymentSchema.index({ leaseId: 1 })
PaymentSchema.index({ paymentForMonth: 1 })

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)