import mongoose, { Schema, Document } from 'mongoose'

export enum NotificationType {
  RENT_REMINDER        = 'RENT_REMINDER',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  LEASE_EXPIRY         = 'LEASE_EXPIRY',
  MAINTENANCE_UPDATE   = 'MAINTENANCE_UPDATE',
  MANAGER_INVITE       = 'MANAGER_INVITE',
  MANAGER_ASSIGNED     = 'MANAGER_ASSIGNED',
  MANAGER_REMOVED      = 'MANAGER_REMOVED',
  GENERAL              = 'GENERAL',
}

export interface INotification extends Document {
  userId:  mongoose.Types.ObjectId
  type:    NotificationType
  title:   string
  message: string
  isRead:  boolean
  link?:   string
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: Object.values(NotificationType), required: true },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
    link:    { type: String },
  },
  { timestamps: true }
)

NotificationSchema.index({ userId: 1, isRead: 1 })

export const Notification = mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)