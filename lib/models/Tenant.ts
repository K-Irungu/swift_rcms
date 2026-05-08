import mongoose, { Schema, Document } from 'mongoose'

export enum OnboardingStatus {
  PENDING              = 'PENDING',
  DOCUMENTS_SUBMITTED  = 'DOCUMENTS_SUBMITTED',
  KYC_APPROVED         = 'KYC_APPROVED',
  KYC_REJECTED         = 'KYC_REJECTED',
  LEASE_SIGNED         = 'LEASE_SIGNED',
  ACTIVE               = 'ACTIVE',
  INACTIVE             = 'INACTIVE',
}

export interface IKycRecord {
  idType:           'national_id' | 'passport'
  idFrontPath:      string
  idBackPath?:      string
  selfiePath?:      string
  submittedAt:      Date
  reviewedAt?:      Date
  rejectionReason?: string
}

export interface ILeaseRecord {
  unitId:         mongoose.Types.ObjectId
  startDate:      Date
  endDate:        Date
  rentAmount:     number
  depositAmount:  number
  signedAt?:      Date
  documentPath?:  string
}

export interface IMoveInPayment {
  depositExpected:      number
  depositReceived:      number
  depositReference?:    string
  depositReceivedAt?:   Date
  firstRentExpected:    number
  firstRentReceived:    number
  firstRentReference?:  string
  firstRentReceivedAt?: Date
}

export interface ITenant extends Document {
  fullName:               string
  email?:                 string
  phone:                  string
  nationalId:             string
  propertyId:             mongoose.Types.ObjectId
  unitId?:                mongoose.Types.ObjectId | null
  emergencyContactName?:  string
  emergencyContactPhone?: string
  onboardingStatus:       OnboardingStatus
  kyc?:                   IKycRecord
  leaseRecord?:           ILeaseRecord
  moveInPayment?:         IMoveInPayment
  notes?:                 string
  createdBy:              mongoose.Types.ObjectId
}

const KycSchema = new Schema<IKycRecord>({
  idType:          { type: String, enum: ['national_id', 'passport'], required: true },
  idFrontPath:     { type: String, required: true },
  idBackPath:      { type: String },
  selfiePath:      { type: String },
  submittedAt:     { type: Date, required: true },
  reviewedAt:      { type: Date },
  rejectionReason: { type: String },
}, { _id: false })

const LeaseRecordSchema = new Schema<ILeaseRecord>({
  unitId:        { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
  startDate:     { type: Date, required: true },
  endDate:       { type: Date, required: true },
  rentAmount:    { type: Number, required: true, min: 0 },
  depositAmount: { type: Number, required: true, min: 0 },
  signedAt:      { type: Date },
  documentPath:  { type: String },
}, { _id: false })

const MoveInPaymentSchema = new Schema<IMoveInPayment>({
  depositExpected:     { type: Number, required: true, min: 0 },
  depositReceived:     { type: Number, default: 0, min: 0 },
  depositReference:    { type: String },
  depositReceivedAt:   { type: Date },
  firstRentExpected:   { type: Number, required: true, min: 0 },
  firstRentReceived:   { type: Number, default: 0, min: 0 },
  firstRentReference:  { type: String },
  firstRentReceivedAt: { type: Date },
}, { _id: false })

const TenantSchema = new Schema<ITenant>(
  {
    fullName:               { type: String, required: true, trim: true },
    email:                  { type: String, trim: true, lowercase: true },
    phone:                  { type: String, required: true, trim: true },
    nationalId:             { type: String, required: true, trim: true },
    propertyId:             { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unitId:                 { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    emergencyContactName:   { type: String, trim: true },
    emergencyContactPhone:  { type: String, trim: true },
    onboardingStatus:       {
      type:    String,
      enum:    Object.values(OnboardingStatus),
      default: OnboardingStatus.PENDING,
    },
    kyc:           { type: KycSchema },
    leaseRecord:   { type: LeaseRecordSchema },
    moveInPayment: { type: MoveInPaymentSchema },
    notes:         { type: String, trim: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

TenantSchema.index({ propertyId: 1, onboardingStatus: 1 })
TenantSchema.index({ unitId: 1 })

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema)

// Drop stale indexes from the old schema (userId_1, idNumber_1)
async function dropLegacyIndexes() {
  for (const idx of ['userId_1', 'idNumber_1', 'status_1']) {
    try { await mongoose.connection.collection('tenants').dropIndex(idx) } catch { /* ok */ }
  }
}
if (mongoose.connection.readyState === 1) dropLegacyIndexes()
else mongoose.connection.once('open', dropLegacyIndexes)
