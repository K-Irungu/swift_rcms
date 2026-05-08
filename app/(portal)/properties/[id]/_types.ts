// ─── Types ────────────────────────────────────────────────────────────────────

export type AgreementTerms = {
  leaseDurationMonths?:  number;
  noticePeriodDays?:     number;
  latePenaltyPercent?:   number;
  latePenaltyGraceDays?: number;
  keyRules?:             string[];
};

export type UnitType = {
  _id: string;
  name: string;
  rentAmount: number;
  depositAmount?: number;
  agreementFilename?: string;
  agreementTerms?: AgreementTerms;
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
  contacts?: Contact[];
  createdAt: string;
  updatedAt: string;
};

export type Unit = {
  _id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number;
  occupancyStatus: "VACANT" | "OCCUPIED";
  currentTenant?: { _id: string; fullName: string } | null;
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
  billing: {
    rentDueDay: number;
    paymentMethods: string[];
  };
};

export type Contact = {
  _id: string;
  role: string;
  name: string;
  phone: string;
};

export type OnboardingStatus =
  | "PENDING"
  | "DOCUMENTS_SUBMITTED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "LEASE_SIGNED"
  | "ACTIVE"
  | "INACTIVE";

export type Tenant = {
  _id: string;
  fullName: string;
  email?: string;
  phone: string;
  nationalId: string;
  propertyId: string;
  unitId?: { _id: string; unitNumber: string } | null;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  onboardingStatus: OnboardingStatus;
  kyc?: {
    idType: "national_id" | "passport";
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    idFrontPath?: string;
    idBackPath?: string;
    selfiePath?: string;
  };
  leaseRecord?: {
    unitId: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    depositAmount: number;
    signedAt?: string;
    documentPath?: string;
  };
  moveInPayment?: {
    depositExpected: number;
    depositReceived: number;
    depositReference?: string;
    depositReceivedAt?: string;
    firstRentExpected: number;
    firstRentReceived: number;
    firstRentReference?: string;
    firstRentReceivedAt?: string;
  };
  notes?: string;
  createdAt: string;
};

export type TabKey = "overview" | "units" | "tenants" | "finance" | "maintenance";


export type PendingInvite = {
  managerName: string;
  managerEmail: string;
  expiresAt: string;
};

export type OverviewTabProps = {
  property: Property;
  slug: string;
  onPropertyUpdate: (updated: Property) => void;
};

export type NewContact = {
  role: string;
  name: string;
  phone: string;
};
