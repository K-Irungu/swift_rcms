import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export enum Role {
  LANDLORD = "LANDLORD",
  PROPERTY_MANAGER = "PROPERTY_MANAGER",
  TENANT = "TENANT",
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  role: Role;
  isActive: boolean;
  refreshToken?: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), required: true },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true },
);
UserSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});
UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.set("toJSON", {
  transform: (_doc, { passwordHash, refreshToken, __v, ...rest }) => rest,
});

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
