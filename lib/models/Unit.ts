import mongoose, { Schema, Document } from 'mongoose'

export enum OccupancyStatus {
  VACANT   = 'VACANT',
  OCCUPIED = 'OCCUPIED',
}

export interface ILeaseTerms {
  leaseDurationMonths?:  number;
  noticePeriodDays?:     number;
  latePenaltyPercent?:   number;
  latePenaltyGraceDays?: number;
  paymentDay?:           number;
}

export interface IUnit extends Document {
  propertyId:      mongoose.Types.ObjectId
  unitNumber:      string
  rentAmount:      number
  depositAmount:   number
  occupancyStatus: OccupancyStatus
  leaseTerms?:     ILeaseTerms
}

const UnitSchema = new Schema<IUnit>(
  {
    propertyId:      { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unitNumber:      { type: String, required: true, trim: true },
    rentAmount:      { type: Number, required: true, min: 0 },
    depositAmount:   { type: Number, required: true, min: 0 },
    occupancyStatus: {
      type: String,
      enum: Object.values(OccupancyStatus),
      default: OccupancyStatus.VACANT,
    },
    leaseTerms: {
      leaseDurationMonths:  { type: Number },
      noticePeriodDays:     { type: Number },
      latePenaltyPercent:   { type: Number },
      latePenaltyGraceDays: { type: Number },
      paymentDay:           { type: Number, min: 1, max: 28 },
    },
  },
  { timestamps: true }
)

UnitSchema.index({ propertyId: 1, unitNumber: 1 }, { unique: true })

export const Unit = mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema)
