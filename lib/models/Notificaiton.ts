import mongoose, { Schema, Document } from 'mongoose'

export enum NotificationType {
  RENT_REMINDER        = 'RENT_REMINDER',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  LEASE_EXPIRY         = 'LEASE_EXPIRY',
  MAINTENANCE_UPDATE   = 'MAINTENANCE_UPDATE',
  GENERAL              = 'GENERAL',
}

export interface INotification extends Document {
  userId:  mongoose.Types.ObjectId
  type:    NotificationType
  title:   string
  message: string
  isRead:  boolean
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: Object.values(NotificationType), required: true },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
)

NotificationSchema.index({ userId: 1, isRead: 1 })

export const Notification = mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)