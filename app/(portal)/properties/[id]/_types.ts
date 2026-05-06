// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitType = {
  _id: string;
  name: string;
  count: number;
  rentAmount: number;
  depositAmount?: number;
};

export type Property = {
  _id: string;
  propertyName: string;
  description?: string;
  coverPhotoUrl?: string;
  location: {
    physicalAddress: string;
    country: string;
    county: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  unitTypes: UnitType[];
  billing: {
    rentDueDay: number;
    paymentMethods: string[];
  };
  propertyManager?: { _id: string; fullName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Unit = {
  _id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  depositAmount: number;
  occupancyStatus: "VACANT" | "OCCUPIED";
};

export type Draft = {
  propertyName: string;
  description: string;
  location: {
    physicalAddress: string;
    country: string;
    county: string;
    city: string;
    coordinates: { lat: number; lng: number } | null;
  };
  unitTypes: Array<{
    _id: string;
    name: string;
    count: number;
    rentAmount: number;
    depositAmount: number;
  }>;
  billing: {
    rentDueDay: number;
    paymentMethods: string[];
  };
};

export type Contact = {
  _id: string; // was: id
  role: string;
  name: string;
  phone: string;
};

export type Props = {
  open: boolean;
  sheetOpen: boolean;
  closeSheet: () => void;
  saving: boolean;
//   draft: Draft | null;
//   setDraft: React.Dispatch<React.SetStateAction<Draft | null>>;
  property: Property;
  onClose: () => void;
  onSaved: (p: Property) => void;
};