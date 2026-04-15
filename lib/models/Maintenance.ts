import mongoose, { Schema, Document } from 'mongoose'

export enum MaintenanceUrgency {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}

export enum MaintenanceStatus {
  PENDING     = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED    = 'RESOLVED',
}

export interface IMaintenance extends Document {
  unitId:           mongoose.Types.ObjectId
  tenantId:         mongoose.Types.ObjectId
  issueDescription: string
  urgency:          MaintenanceUrgency
  photoUrl?:        string
  status:           MaintenanceStatus
  assignedTo?:      string
  resolvedAt?:      Date
}

const MaintenanceSchema = new Schema<IMaintenance>(
  {
    unitId:           { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    issueDescription: { type: String, required: true },
    urgency:          { type: String, enum: Object.values(MaintenanceUrgency), default: MaintenanceUrgency.LOW },
    photoUrl:         { type: String },
    status:           { type: String, enum: Object.values(MaintenanceStatus), default: MaintenanceStatus.PENDING },
    assignedTo:       { type: String },
    resolvedAt:       { type: Date },
  },
  { timestamps: true }
)

MaintenanceSchema.index({ unitId: 1 })
MaintenanceSchema.index({ tenantId: 1 })
MaintenanceSchema.index({ status: 1, urgency: -1 })

export const Maintenance = mongoose.models.Maintenance ||
  mongoose.model<IMaintenance>('Maintenance', MaintenanceSchema)