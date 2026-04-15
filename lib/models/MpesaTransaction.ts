import mongoose, { Schema, Document } from 'mongoose'

export enum MpesaStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED  = 'FAILED',
}

export interface IMpesaTransaction extends Document {
  checkoutRequestId:  string
  leaseId:            mongoose.Types.ObjectId
  phoneNumber:        string
  amount:             number
  status:             MpesaStatus
  resultCode?:        string
  resultDesc?:        string
  mpesaReceiptNumber?: string
}

const MpesaTransactionSchema = new Schema<IMpesaTransaction>(
  {
    checkoutRequestId:  { type: String, required: true, unique: true },
    leaseId:            { type: Schema.Types.ObjectId, ref: 'Lease', required: true },
    phoneNumber:        { type: String, required: true },
    amount:             { type: Number, required: true },
    status:             { type: String, enum: Object.values(MpesaStatus), default: MpesaStatus.PENDING },
    resultCode:         { type: String },
    resultDesc:         { type: String },
    mpesaReceiptNumber: { type: String },
  },
  { timestamps: true }
)

export const MpesaTransaction = mongoose.models.MpesaTransaction ||
  mongoose.model<IMpesaTransaction>('MpesaTransaction', MpesaTransactionSchema)