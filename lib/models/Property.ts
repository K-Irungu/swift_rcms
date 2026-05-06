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

  createdAt: Date;
  updatedAt: Date;
}

const UnitTypeSchema = new Schema<IUnitType>({
  name: { type: String, required: true },
  count: { type: Number, required: true },
  rentAmount: { type: Number, required: true },
  depositAmount: { type: Number },
});

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

    unitTypes: {
      type: [UnitTypeSchema],
      required: true,
    },

    billing: {
      rentDueDay: { type: Number, required: true },
      paymentMethods: { type: [String], required: true },
    },
  },
  { timestamps: true },
);

export default models.Property || model<IProperty>("Property", PropertySchema);
