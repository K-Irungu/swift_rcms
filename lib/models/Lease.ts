import mongoose, { Schema, Document } from 'mongoose'

export enum LeaseStatus {
  ACTIVE     = 'ACTIVE',
  EXPIRED    = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export interface ILease extends Document {
  tenantId:         mongoose.Types.ObjectId
  unitId:           mongoose.Types.ObjectId
  startDate:        Date
  endDate:          Date
  monthlyRent:      number
  depositPaid:      number
  leaseDocumentUrl?: string
  status:           LeaseStatus
}

const LeaseSchema = new Schema<ILease>(
  {
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    unitId:           { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    monthlyRent:      { type: Number, required: true },
    depositPaid:      { type: Number, required: true },
    leaseDocumentUrl: { type: String },
    status:           { type: String, enum: Object.values(LeaseStatus), default: LeaseStatus.ACTIVE },
  },
  { timestamps: true }
)

LeaseSchema.index({ tenantId: 1 })
LeaseSchema.index({ unitId: 1 })
LeaseSchema.index({ status: 1, endDate: 1 })

export const Lease = mongoose.models.Lease || mongoose.model<ILease>('Lease', LeaseSchema)