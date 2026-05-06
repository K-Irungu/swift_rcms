import { Schema, Document, models, model } from "mongoose";

export interface IUnitType {
  name: string;
  count: number;
  rentAmount: number;
  depositAmount?: number;
}



export interface IProperty extends Document {
  propertyName: string;
  slug: string;
  description?: string;
  coverPhotoUrl?: string;
ownerId: Schema.Types.ObjectId;
  location: {
    physicalAddress: string;
    country: string;
    county: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  unitTypes: IUnitType[];

  billing: {
    rentDueDay: number;
    paymentMethods: string[];
  };
  contacts: {
    role: string;
    name: string;
    phone?: string;
  }[];
  propertyManager: {
  type: Schema.Types.ObjectId,
  ref: "User",
  default: null,
}
  createdAt: Date;
  updatedAt: Date;
}

const UnitTypeSchema = new Schema<IUnitType>({
  name: { type: String, required: true },
  count: { type: Number, required: true },
  rentAmount: { type: Number, required: true },
  depositAmount: { type: Number },
});


const ContactSchema = new Schema(
  {
    role:  { type: String, required: true, trim: true },
    name:  { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
  },
  { _id: true } // gives each contact its own _id automatically
);
const PropertySchema = new Schema<IProperty>(
  {
    propertyName: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true, index: true },
    description: { type: String },
    coverPhotoUrl: { type: String },

    location: {
      physicalAddress: { type: String, required: true },
      country: { type: String, required: true },
      county: { type: String, required: true },
      city: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    propertyManager: {
  type: Schema.Types.ObjectId,
  ref: "User",
  default: null,
},
ownerId: {
  type: Schema.Types.ObjectId,
  ref: "User",
  required: true,
},

    // Configuration template only — actual Unit records are created separately.
    // Changes here do NOT auto-update existing Unit documents.
    unitTypes: {
      type: [UnitTypeSchema],
      required: true,
    },

    billing: {
      // 1–28 keeps the day valid across all months including February
      rentDueDay: { type: Number, required: true, min: 1, max: 28 },
      paymentMethods: { type: [String], required: true },
    },
      contacts: { type: [ContactSchema], default: [] },

  },
  { timestamps: true },
);

export default models.Property || model<IProperty>("Property", PropertySchema);
