import mongoose, { Schema, Document } from 'mongoose'

export interface ITenant extends Document {
  userId:                mongoose.Types.ObjectId
  idNumber:              string
  emergencyContactName:  string
  emergencyContactPhone: string
}

const TenantSchema = new Schema<ITenant>(
  {
    userId:                { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    idNumber:              { type: String, required: true, unique: true },
    emergencyContactName:  { type: String, required: true },
    emergencyContactPhone: { type: String, required: true },
  },
  { timestamps: true }
)

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema)