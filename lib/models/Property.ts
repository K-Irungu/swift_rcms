import mongoose, { Schema, Document } from 'mongoose'

export enum PropertyType {
  APARTMENT  = 'APARTMENT',
  HOUSE      = 'HOUSE',
  COMMERCIAL = 'COMMERCIAL',
}

export interface IProperty extends Document {
  ownerId:      mongoose.Types.ObjectId
  propertyName: string
  address:      string
  city:         string
  propertyType: PropertyType
}

const PropertySchema = new Schema<IProperty>(
  {
    ownerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    propertyName: { type: String, required: true, trim: true },
    address:      { type: String, required: true },
    city:         { type: String, required: true },
    propertyType: { type: String, enum: Object.values(PropertyType), required: true },
  },
  { timestamps: true }
)

PropertySchema.index({ ownerId: 1 })

export const Property = mongoose.models.Property ||
  mongoose.model<IProperty>('Property', PropertySchema)