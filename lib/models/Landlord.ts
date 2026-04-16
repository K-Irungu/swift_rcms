import mongoose, { Schema, Document } from "mongoose";

export interface ILandlord extends Document {
  userId: mongoose.Types.ObjectId;
  businessName?: string;
  kraPin?: string;
}
const LandlordSchema = new Schema<ILandlord>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, default: "" },
    kraPin:       { type: String, default: "" },
  },
  { timestamps: true }
)

export const Landlord =
  mongoose.models.Landlord || mongoose.model<ILandlord>("Landlord", LandlordSchema);