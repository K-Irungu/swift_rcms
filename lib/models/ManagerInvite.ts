import mongoose, { Schema, Document } from "mongoose";

export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

export interface IManagerInvite extends Document {
  propertyId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  token: string;
  status: InviteStatus;
  expiresAt: Date;
}

const ManagerInviteSchema = new Schema<IManagerInvite>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    managerId:  { type: Schema.Types.ObjectId, ref: "User",     required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "User",     required: true },
    token:      { type: String, required: true, unique: true },
    status:     { type: String, enum: ["PENDING", "ACCEPTED", "EXPIRED"], default: "PENDING" },
    expiresAt:  { type: Date, required: true },
  },
  { timestamps: true },
);

// ManagerInviteSchema.index({ token: 1 });
ManagerInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ManagerInvite =
  (mongoose.models.ManagerInvite as mongoose.Model<IManagerInvite>) ||
  mongoose.model<IManagerInvite>("ManagerInvite", ManagerInviteSchema);
