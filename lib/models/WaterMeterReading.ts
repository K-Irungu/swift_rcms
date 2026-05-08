import mongoose, { Schema, Document } from 'mongoose'

export interface IWaterMeterReading extends Document {
  unitId:          mongoose.Types.ObjectId
  propertyId:      mongoose.Types.ObjectId
  readingDate:     Date
  reading:         number   // current meter value
  previousReading: number   // snapshot from previous record
  consumption:     number   // reading - previousReading
  rateUsed:        number   // KES per unit, snapshot at time of recording
  amount:          number   // consumption × rateUsed
  recordedBy:      mongoose.Types.ObjectId
  invoiceId?:      mongoose.Types.ObjectId
  photoUrl?:       string
}

const WaterMeterReadingSchema = new Schema<IWaterMeterReading>(
  {
    unitId:          { type: Schema.Types.ObjectId, ref: 'Unit',    required: true },
    propertyId:      { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    readingDate:     { type: Date,   required: true },
    reading:         { type: Number, required: true, min: 0 },
    previousReading: { type: Number, required: true, min: 0 },
    consumption:     { type: Number, required: true, min: 0 },
    rateUsed:        { type: Number, required: true, min: 0 },
    amount:          { type: Number, required: true, min: 0 },
    recordedBy:      { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    invoiceId:       { type: Schema.Types.ObjectId, ref: 'Invoice'                },
    photoUrl:        { type: String },
  },
  { timestamps: true }
)

// Latest reading per unit
WaterMeterReadingSchema.index({ unitId: 1, readingDate: -1 })
// All readings for a property in a date range (monthly invoice generation)
WaterMeterReadingSchema.index({ propertyId: 1, readingDate: -1 })
// Find unbilled readings quickly
WaterMeterReadingSchema.index({ invoiceId: 1 })

export const WaterMeterReading =
  mongoose.models.WaterMeterReading ||
  mongoose.model<IWaterMeterReading>('WaterMeterReading', WaterMeterReadingSchema)
