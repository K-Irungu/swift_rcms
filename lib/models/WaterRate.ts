import mongoose, { Schema, Document } from 'mongoose'

export interface IWaterRate extends Document {
  propertyId:    mongoose.Types.ObjectId
  ratePerUnit:   number
  effectiveFrom: Date
  createdBy:     mongoose.Types.ObjectId
}

const WaterRateSchema = new Schema<IWaterRate>(
  {
    propertyId:    { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    ratePerUnit:   { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// Fetch current rate: findOne({ propertyId }).sort({ effectiveFrom: -1 })
WaterRateSchema.index({ propertyId: 1, effectiveFrom: -1 })

export const WaterRate =
  mongoose.models.WaterRate || mongoose.model<IWaterRate>('WaterRate', WaterRateSchema)
