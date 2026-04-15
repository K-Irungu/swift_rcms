import mongoose, { Schema, Document } from 'mongoose'

export enum OccupancyStatus {
  VACANT   = 'VACANT',
  OCCUPIED = 'OCCUPIED',
}

export interface IUnit extends Document {
  propertyId:      mongoose.Types.ObjectId
  unitNumber:      string
  bedrooms:        number
  bathrooms:       number
  rentAmount:      number
  depositAmount:   number
  occupancyStatus: OccupancyStatus
}

const UnitSchema = new Schema<IUnit>(
  {
    propertyId:      { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unitNumber:      { type: String, required: true, trim: true },
    bedrooms:        { type: Number, required: true, min: 0 },
    bathrooms:       { type: Number, required: true, min: 0 },
    rentAmount:      { type: Number, required: true, min: 0 },
    depositAmount:   { type: Number, required: true, min: 0 },
    occupancyStatus: {
      type: String,
      enum: Object.values(OccupancyStatus),
      default: OccupancyStatus.VACANT,
    },
  },
  { timestamps: true }
)

UnitSchema.index({ propertyId: 1, unitNumber: 1 }, { unique: true })

export const Unit = mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema)