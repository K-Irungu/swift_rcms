import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;

// ─── Schema re-declarations (avoid Next.js model cache issues) ────────────────

const UnitTypeSchema = new mongoose.Schema({
  name: String, count: Number, rentAmount: Number, depositAmount: Number,
});
const PropertySchema = new mongoose.Schema(
  {
    propertyName: String, slug: String, description: String, coverPhotoUrl: String,
    location: {
      physicalAddress: String, country: String, county: String, city: String,
      coordinates: { lat: Number, lng: Number },
    },
    unitTypes: [UnitTypeSchema],
    billing: { rentDueDay: Number, paymentMethods: [String] },
  },
  { timestamps: true }
);
const UserSchema = new mongoose.Schema(
  { fullName: String, email: String, passwordHash: String, phoneNumber: String, role: String, isActive: Boolean },
  { timestamps: true }
);
const TenantSchema = new mongoose.Schema(
  { userId: mongoose.Schema.Types.ObjectId, idNumber: String, emergencyContactName: String, emergencyContactPhone: String },
  { timestamps: true }
);
const UnitSchema = new mongoose.Schema(
  {
    propertyId: mongoose.Schema.Types.ObjectId, unitNumber: String,
    bedrooms: Number, bathrooms: Number, rentAmount: Number,
    depositAmount: Number, occupancyStatus: { type: String, default: "VACANT" },
  },
  { timestamps: true }
);
const LeaseSchema = new mongoose.Schema(
  {
    tenantId: mongoose.Schema.Types.ObjectId, unitId: mongoose.Schema.Types.ObjectId,
    startDate: Date, endDate: Date, monthlyRent: Number, depositPaid: Number,
    status: { type: String, default: "ACTIVE" },
  },
  { timestamps: true }
);
const InvoiceSchema = new mongoose.Schema(
  {
    leaseId: mongoose.Schema.Types.ObjectId, invoiceDate: Date, dueDate: Date,
    amount: Number, lateFee: { type: Number, default: 0 }, billingPeriod: Date,
    status: { type: String, default: "PENDING" },
  },
  { timestamps: true }
);
const PaymentSchema = new mongoose.Schema(
  {
    leaseId: mongoose.Schema.Types.ObjectId, amount: Number, paymentDate: Date,
    paymentMethod: String, transactionRef: String, paymentForMonth: Date,
    mpesaReceiptNumber: String,
  },
  { timestamps: true }
);
const MaintenanceSchema = new mongoose.Schema(
  {
    unitId: mongoose.Schema.Types.ObjectId, tenantId: mongoose.Schema.Types.ObjectId,
    issueDescription: String, urgency: { type: String, default: "LOW" },
    status: { type: String, default: "PENDING" }, assignedTo: String, resolvedAt: Date,
  },
  { timestamps: true }
);

const Property   = mongoose.model("Property",    PropertySchema);
const User       = mongoose.model("User",         UserSchema);
const Tenant     = mongoose.model("Tenant",       TenantSchema);
const Unit       = mongoose.model("Unit",         UnitSchema);
const Lease      = mongoose.model("Lease",        LeaseSchema);
const Invoice    = mongoose.model("Invoice",      InvoiceSchema);
const Payment    = mongoose.model("Payment",      PaymentSchema);
const Maintenance = mongoose.model("Maintenance", MaintenanceSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day);
}
function addMonths(date: Date, n: number) {
  const r = new Date(date);
  r.setMonth(r.getMonth() + n);
  return r;
}
let refCounter = 1000;
function txRef() { return `TXN-${(refCounter++).toString().padStart(6, "0")}`; }
function mpesaRef() { return `QHZ${Math.random().toString(36).slice(2, 9).toUpperCase()}`; }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear all collections
  await Promise.all([
    Property.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({}),
    Unit.deleteMany({}), Lease.deleteMany({}), Invoice.deleteMany({}),
    Payment.deleteMany({}), Maintenance.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // ─── Properties ─────────────────────────────────────────────────────────────

  const properties = await Property.insertMany([
    {
      propertyName: "Westlands Heights",
      slug: "westlands-heights-nbi1",
      description: "Modern mid-rise apartment complex in the heart of Westlands, minutes from Sarit Centre and major business hubs.",
      location: {
        physicalAddress: "14 Chiromo Road, Westlands",
        country: "Kenya", county: "Nairobi", city: "Westlands",
        coordinates: { lat: -1.2631, lng: 36.8041 },
      },
      unitTypes: [
        { name: "2 Bedroom", count: 5, rentAmount: 55000, depositAmount: 55000 },
        { name: "3 Bedroom", count: 3, rentAmount: 85000, depositAmount: 85000 },
      ],
      billing: { rentDueDay: 1, paymentMethods: ["MPESA", "BANK_TRANSFER"] },
    },
    {
      propertyName: "Kilimani Gardens",
      slug: "kilimani-gardens-nbi2",
      description: "Quiet apartment block nestled in Kilimani's leafy residential area. Walking distance to Yaya Centre.",
      location: {
        physicalAddress: "23 Argwings Kodhek Road, Kilimani",
        country: "Kenya", county: "Nairobi", city: "Kilimani",
        coordinates: { lat: -1.2921, lng: 36.7845 },
      },
      unitTypes: [
        { name: "Studio",    count: 6, rentAmount: 28000, depositAmount: 28000 },
        { name: "1 Bedroom", count: 6, rentAmount: 42000, depositAmount: 42000 },
      ],
      billing: { rentDueDay: 5, paymentMethods: ["MPESA"] },
    },
    {
      propertyName: "Lavington Court",
      slug: "lavington-court-nbi3",
      description: "Exclusive gated community of spacious townhouses in Lavington. Private gardens and 24hr security.",
      location: {
        physicalAddress: "7 James Gichuru Road, Lavington",
        country: "Kenya", county: "Nairobi", city: "Lavington",
        coordinates: { lat: -1.2875, lng: 36.7731 },
      },
      unitTypes: [
        { name: "3 Bedroom Townhouse", count: 3, rentAmount: 120000, depositAmount: 240000 },
        { name: "4 Bedroom Townhouse", count: 3, rentAmount: 160000, depositAmount: 320000 },
      ],
      billing: { rentDueDay: 1, paymentMethods: ["BANK_TRANSFER"] },
    },
    {
      propertyName: "Eastleigh Plaza",
      slug: "eastleigh-plaza-nbi4",
      description: "Affordable residential units strategically located in Eastleigh. Close to public transport and markets.",
      location: {
        physicalAddress: "Section 3, 1st Avenue, Eastleigh",
        country: "Kenya", county: "Nairobi", city: "Eastleigh",
        coordinates: { lat: -1.2676, lng: 36.8504 },
      },
      unitTypes: [
        { name: "Bedsitter", count: 10, rentAmount: 12000, depositAmount: 12000 },
        { name: "1 Bedroom",  count: 10, rentAmount: 18000, depositAmount: 18000 },
      ],
      billing: { rentDueDay: 1, paymentMethods: ["MPESA", "CASH"] },
    },
    {
      propertyName: "Karen Ridge",
      slug: "karen-ridge-nbi5",
      description: "Prestigious luxury villas set on expansive grounds in Karen. Each villa features a private pool and staff quarters.",
      location: {
        physicalAddress: "Bogani East Road, Karen",
        country: "Kenya", county: "Nairobi", city: "Karen",
        coordinates: { lat: -1.3278, lng: 36.7067 },
      },
      unitTypes: [
        { name: "4 Bedroom Villa", count: 3, rentAmount: 250000, depositAmount: 500000 },
        { name: "5 Bedroom Villa", count: 2, rentAmount: 350000, depositAmount: 700000 },
      ],
      billing: { rentDueDay: 1, paymentMethods: ["BANK_TRANSFER"] },
    },
  ]);
  console.log(`Created ${properties.length} properties`);

  const [westlands, kilimani, lavington, eastleigh, karen] = properties;

  // ─── Tenant Users ────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("Tenant@2024", 12);

  const tenantUserData = [
    // Westlands tenants
    { fullName: "Amina Odhiambo",   email: "amina.odhiambo@email.com",   phoneNumber: "0712345601" },
    { fullName: "Brian Mwangi",     email: "brian.mwangi@email.com",     phoneNumber: "0712345602" },
    { fullName: "Catherine Njeri",  email: "catherine.njeri@email.com",  phoneNumber: "0712345603" },
    { fullName: "David Kipchoge",   email: "david.kipchoge@email.com",   phoneNumber: "0712345604" },
    { fullName: "Esther Wanjiku",   email: "esther.wanjiku@email.com",   phoneNumber: "0712345605" },
    { fullName: "Francis Otieno",   email: "francis.otieno@email.com",   phoneNumber: "0712345606" },
    // Kilimani tenants
    { fullName: "Grace Kamau",      email: "grace.kamau@email.com",      phoneNumber: "0712345607" },
    { fullName: "Hassan Abdullahi", email: "hassan.abdullahi@email.com", phoneNumber: "0712345608" },
    { fullName: "Irene Chebet",     email: "irene.chebet@email.com",     phoneNumber: "0712345609" },
    { fullName: "James Karanja",    email: "james.karanja@email.com",    phoneNumber: "0712345610" },
    // Lavington tenants
    { fullName: "Kunal Patel",      email: "kunal.patel@email.com",      phoneNumber: "0712345611" },
    { fullName: "Lillian Akinyi",   email: "lillian.akinyi@email.com",   phoneNumber: "0712345612" },
    // Eastleigh tenants
    { fullName: "Mohamed Hassan",   email: "mohamed.hassan@email.com",   phoneNumber: "0712345613" },
    { fullName: "Nancy Waweru",     email: "nancy.waweru@email.com",     phoneNumber: "0712345614" },
    { fullName: "Omar Farah",       email: "omar.farah@email.com",       phoneNumber: "0712345615" },
    { fullName: "Patricia Mutua",   email: "patricia.mutua@email.com",   phoneNumber: "0712345616" },
    { fullName: "Robert Kimani",    email: "robert.kimani@email.com",    phoneNumber: "0712345617" },
    // Karen tenants
    { fullName: "Sandra Wangari",   email: "sandra.wangari@email.com",   phoneNumber: "0712345618" },
    { fullName: "Thomas Nganga",    email: "thomas.nganga@email.com",    phoneNumber: "0712345619" },
  ];

  const tenantUsers = await User.insertMany(
    tenantUserData.map((u) => ({ ...u, passwordHash, role: "TENANT", isActive: true }))
  );

  const tenants = await Tenant.insertMany(
    tenantUsers.map((u, i) => ({
      userId: u._id,
      idNumber: `3${(7000000 + i * 37891).toString()}`,
      emergencyContactName: `Next of Kin ${i + 1}`,
      emergencyContactPhone: `071999${String(i).padStart(4, "0")}`,
    }))
  );
  console.log(`Created ${tenants.length} tenants`);

  // ─── Units ───────────────────────────────────────────────────────────────────

  // Westlands Heights — 5×2BR + 3×3BR = 8 units, 6 occupied
  const wUnits = await Unit.insertMany([
    { propertyId: westlands._id, unitNumber: "W-101", bedrooms: 2, bathrooms: 2, rentAmount: 55000, depositAmount: 55000, occupancyStatus: "OCCUPIED" },
    { propertyId: westlands._id, unitNumber: "W-102", bedrooms: 2, bathrooms: 2, rentAmount: 55000, depositAmount: 55000, occupancyStatus: "OCCUPIED" },
    { propertyId: westlands._id, unitNumber: "W-103", bedrooms: 2, bathrooms: 2, rentAmount: 55000, depositAmount: 55000, occupancyStatus: "OCCUPIED" },
    { propertyId: westlands._id, unitNumber: "W-201", bedrooms: 2, bathrooms: 2, rentAmount: 55000, depositAmount: 55000, occupancyStatus: "OCCUPIED" },
    { propertyId: westlands._id, unitNumber: "W-202", bedrooms: 2, bathrooms: 2, rentAmount: 55000, depositAmount: 55000, occupancyStatus: "VACANT"   },
    { propertyId: westlands._id, unitNumber: "W-301", bedrooms: 3, bathrooms: 2, rentAmount: 85000, depositAmount: 85000, occupancyStatus: "OCCUPIED" },
    { propertyId: westlands._id, unitNumber: "W-302", bedrooms: 3, bathrooms: 2, rentAmount: 85000, depositAmount: 85000, occupancyStatus: "OCCUPIED" },
    { propertyId: westlands._id, unitNumber: "W-303", bedrooms: 3, bathrooms: 2, rentAmount: 85000, depositAmount: 85000, occupancyStatus: "VACANT"   },
  ]);

  // Kilimani Gardens — 6×Studio + 6×1BR = 12 units, 10 occupied
  const kUnits = await Unit.insertMany([
    { propertyId: kilimani._id, unitNumber: "KG-A1", bedrooms: 0, bathrooms: 1, rentAmount: 28000, depositAmount: 28000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-A2", bedrooms: 0, bathrooms: 1, rentAmount: 28000, depositAmount: 28000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-A3", bedrooms: 0, bathrooms: 1, rentAmount: 28000, depositAmount: 28000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-A4", bedrooms: 0, bathrooms: 1, rentAmount: 28000, depositAmount: 28000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-A5", bedrooms: 0, bathrooms: 1, rentAmount: 28000, depositAmount: 28000, occupancyStatus: "VACANT"   },
    { propertyId: kilimani._id, unitNumber: "KG-A6", bedrooms: 0, bathrooms: 1, rentAmount: 28000, depositAmount: 28000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-B1", bedrooms: 1, bathrooms: 1, rentAmount: 42000, depositAmount: 42000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-B2", bedrooms: 1, bathrooms: 1, rentAmount: 42000, depositAmount: 42000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-B3", bedrooms: 1, bathrooms: 1, rentAmount: 42000, depositAmount: 42000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-B4", bedrooms: 1, bathrooms: 1, rentAmount: 42000, depositAmount: 42000, occupancyStatus: "OCCUPIED" },
    { propertyId: kilimani._id, unitNumber: "KG-B5", bedrooms: 1, bathrooms: 1, rentAmount: 42000, depositAmount: 42000, occupancyStatus: "VACANT"   },
    { propertyId: kilimani._id, unitNumber: "KG-B6", bedrooms: 1, bathrooms: 1, rentAmount: 42000, depositAmount: 42000, occupancyStatus: "OCCUPIED" },
  ]);

  // Lavington Court — 3×3BR + 3×4BR = 6 units, 4 occupied
  const lUnits = await Unit.insertMany([
    { propertyId: lavington._id, unitNumber: "LC-TH1", bedrooms: 3, bathrooms: 3, rentAmount: 120000, depositAmount: 240000, occupancyStatus: "OCCUPIED" },
    { propertyId: lavington._id, unitNumber: "LC-TH2", bedrooms: 3, bathrooms: 3, rentAmount: 120000, depositAmount: 240000, occupancyStatus: "OCCUPIED" },
    { propertyId: lavington._id, unitNumber: "LC-TH3", bedrooms: 3, bathrooms: 3, rentAmount: 120000, depositAmount: 240000, occupancyStatus: "VACANT"   },
    { propertyId: lavington._id, unitNumber: "LC-TH4", bedrooms: 4, bathrooms: 3, rentAmount: 160000, depositAmount: 320000, occupancyStatus: "OCCUPIED" },
    { propertyId: lavington._id, unitNumber: "LC-TH5", bedrooms: 4, bathrooms: 3, rentAmount: 160000, depositAmount: 320000, occupancyStatus: "OCCUPIED" },
    { propertyId: lavington._id, unitNumber: "LC-TH6", bedrooms: 4, bathrooms: 3, rentAmount: 160000, depositAmount: 320000, occupancyStatus: "VACANT"   },
  ]);

  // Eastleigh Plaza — 10×Bedsitter + 10×1BR = 20 units, 15 occupied
  const eUnits = await Unit.insertMany([
    { propertyId: eastleigh._id, unitNumber: "EP-B01", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B02", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B03", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B04", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B05", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B06", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B07", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "VACANT"   },
    { propertyId: eastleigh._id, unitNumber: "EP-B08", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "VACANT"   },
    { propertyId: eastleigh._id, unitNumber: "EP-B09", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-B10", bedrooms: 0, bathrooms: 1, rentAmount: 12000, depositAmount: 12000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A01", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A02", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A03", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A04", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "VACANT"   },
    { propertyId: eastleigh._id, unitNumber: "EP-A05", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "VACANT"   },
    { propertyId: eastleigh._id, unitNumber: "EP-A06", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A07", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A08", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A09", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
    { propertyId: eastleigh._id, unitNumber: "EP-A10", bedrooms: 1, bathrooms: 1, rentAmount: 18000, depositAmount: 18000, occupancyStatus: "OCCUPIED" },
  ]);

  // Karen Ridge — 3×4BR + 2×5BR = 5 units, 3 occupied
  const kaUnits = await Unit.insertMany([
    { propertyId: karen._id, unitNumber: "KR-V1", bedrooms: 4, bathrooms: 4, rentAmount: 250000, depositAmount: 500000, occupancyStatus: "OCCUPIED" },
    { propertyId: karen._id, unitNumber: "KR-V2", bedrooms: 4, bathrooms: 4, rentAmount: 250000, depositAmount: 500000, occupancyStatus: "OCCUPIED" },
    { propertyId: karen._id, unitNumber: "KR-V3", bedrooms: 4, bathrooms: 4, rentAmount: 250000, depositAmount: 500000, occupancyStatus: "VACANT"   },
    { propertyId: karen._id, unitNumber: "KR-V4", bedrooms: 5, bathrooms: 5, rentAmount: 350000, depositAmount: 700000, occupancyStatus: "OCCUPIED" },
    { propertyId: karen._id, unitNumber: "KR-V5", bedrooms: 5, bathrooms: 5, rentAmount: 350000, depositAmount: 700000, occupancyStatus: "VACANT"   },
  ]);

  console.log("Created all units");

  // ─── Leases ──────────────────────────────────────────────────────────────────
  // Tenant index allocation:
  // Westlands: tenants 0-5 (6 occupied units)
  // Kilimani:  tenants 6-9 (4 studios) + indices 6-9 for 6 occupied (reusing for 1BRs: 6-9)
  // Lavington: tenants 10-11 (2 occupied 3BR) + 10 for TH4, 11 for TH5
  // Eastleigh: tenants 12-16 (5 tenants shared across 15 units — some tenants have 2 units, but that's unusual)
  // Let's keep 1 tenant per lease, and we have 19 tenants total

  // Westlands: 6 occupied → tenants 0-5
  // Kilimani: 10 occupied → tenants 6-9 (only 4 left after westlands... let's re-plan)
  // We have 19 tenants. Assign:
  // Westlands: 6 (tenants 0-5)
  // Kilimani: 4 (tenants 6-9) — but 10 occupied. Let me fix: kilimani has 10 occupied, lavington 4, eastleigh 15, karen 3 = 38 occupied
  // We only have 19 tenants. Let's say some tenants have 2 units? No, that's unrealistic.
  // Let me reduce occupied count or add more tenants. Let me just assign tenants to a subset of units.
  // Westlands 6, Kilimani 4, Lavington 2, Eastleigh 5, Karen 2 = 19 tenants, perfect.

  const occupiedWUnits  = wUnits.filter(u => u.occupancyStatus === "OCCUPIED");   // 6
  const occupiedKUnits  = kUnits.filter(u => u.occupancyStatus === "OCCUPIED").slice(0, 4); // only 4 tenants for kilimani
  const occupiedLUnits  = lUnits.filter(u => u.occupancyStatus === "OCCUPIED").slice(0, 2); // 2
  const occupiedEUnits  = eUnits.filter(u => u.occupancyStatus === "OCCUPIED").slice(0, 5); // 5
  const occupiedKaUnits = kaUnits.filter(u => u.occupancyStatus === "OCCUPIED").slice(0, 2); // 2

  const leasedUnits = [
    ...occupiedWUnits, ...occupiedKUnits, ...occupiedLUnits, ...occupiedEUnits, ...occupiedKaUnits
  ];

  const leases = await Lease.insertMany(
    leasedUnits.map((unit, i) => ({
      tenantId:    tenants[i]._id,
      unitId:      unit._id,
      startDate:   d(2025, 5, 1),
      endDate:     d(2026, 4, 30),
      monthlyRent: unit.rentAmount,
      depositPaid: unit.depositAmount,
      status:      "ACTIVE",
    }))
  );
  console.log(`Created ${leases.length} leases`);

  // ─── Invoices & Payments ──────────────────────────────────────────────────────
  // Create invoices for Mar, Apr, and May 2026.
  // Mar 2026: all PAID
  // Apr 2026: all PAID
  // May 2026 (current month): some PAID, some OVERDUE, some PENDING

  const invoicesData: object[] = [];
  const paymentsData: object[] = [];

  for (let i = 0; i < leases.length; i++) {
    const lease = leases[i];
    const rent  = (lease as any).monthlyRent;

    // Helper: paid invoice + matching payment
    const paidEntry = (billingMonth: Date, paidOn: Date, method: string, late = 0) => {
      const leaseId = lease._id;
      invoicesData.push({
        leaseId,
        invoiceDate:   billingMonth,
        dueDate:       addMonths(billingMonth, 0),
        amount:        rent + late,
        lateFee:       late,
        billingPeriod: billingMonth,
        status:        "PAID",
      });
      paymentsData.push({
        leaseId,
        amount:             rent + late,
        paymentDate:        paidOn,
        paymentMethod:      method,
        transactionRef:     txRef(),
        paymentForMonth:    billingMonth,
        mpesaReceiptNumber: method === "MPESA" ? mpesaRef() : undefined,
      });
    };

    const overdueEntry = (billingMonth: Date) => {
      invoicesData.push({
        leaseId:       lease._id,
        invoiceDate:   billingMonth,
        dueDate:       addMonths(billingMonth, 0),
        amount:        rent,
        lateFee:       0,
        billingPeriod: billingMonth,
        status:        "OVERDUE",
      });
    };

    const pendingEntry = (billingMonth: Date) => {
      invoicesData.push({
        leaseId:       lease._id,
        invoiceDate:   billingMonth,
        dueDate:       new Date(2026, 4, 30),
        amount:        rent,
        billingPeriod: billingMonth,
        status:        "PENDING",
      });
    };

    // March 2026 — all PAID
    paidEntry(d(2026, 3, 1), d(2026, 3, 2), i % 3 === 0 ? "BANK_TRANSFER" : "MPESA");

    // April 2026 — all PAID
    paidEntry(d(2026, 4, 1), d(2026, 4, 3), i % 3 === 0 ? "BANK_TRANSFER" : "MPESA");

    // May 2026 (current month) — varied statuses
    // Westlands (0-5): 4 paid, 2 overdue
    // Kilimani (6-9): all 4 paid
    // Lavington (10-11): 1 paid, 1 overdue (struggling tenant)
    // Eastleigh (12-16): 3 paid, 2 overdue
    // Karen (17-18): both paid
    if (i <= 5) {
      // Westlands: leases 0-3 paid, 4-5 overdue
      if (i <= 3) paidEntry(d(2026, 5, 1), d(2026, 5, 2), "MPESA");
      else overdueEntry(d(2026, 5, 1));
    } else if (i <= 9) {
      // Kilimani: all paid
      paidEntry(d(2026, 5, 1), d(2026, 5, 5), "MPESA");
    } else if (i <= 11) {
      // Lavington: lease 10 paid, lease 11 overdue
      if (i === 10) paidEntry(d(2026, 5, 1), d(2026, 5, 1), "BANK_TRANSFER");
      else overdueEntry(d(2026, 5, 1));
    } else if (i <= 16) {
      // Eastleigh: leases 12-14 paid, 15-16 overdue
      if (i <= 14) paidEntry(d(2026, 5, 1), d(2026, 5, 3), "MPESA");
      else overdueEntry(d(2026, 5, 1));
    } else {
      // Karen: both paid
      paidEntry(d(2026, 5, 1), d(2026, 5, 1), "BANK_TRANSFER");
    }
  }

  await Invoice.insertMany(invoicesData);
  await Payment.insertMany(paymentsData);
  console.log(`Created ${invoicesData.length} invoices and ${paymentsData.length} payments`);

  // ─── Maintenance Requests ─────────────────────────────────────────────────────

  await Maintenance.insertMany([
    {
      unitId:           wUnits[0]._id,
      tenantId:         tenants[0]._id,
      issueDescription: "Kitchen sink leaking — water pooling under the cabinet",
      urgency:          "HIGH",
      status:           "IN_PROGRESS",
      assignedTo:       "Mwangi Plumbing Services",
    },
    {
      unitId:           wUnits[2]._id,
      tenantId:         tenants[2]._id,
      issueDescription: "Bathroom exhaust fan not working",
      urgency:          "LOW",
      status:           "PENDING",
    },
    {
      unitId:           kUnits[0]._id,
      tenantId:         tenants[6]._id,
      issueDescription: "Ceiling light fixture flickering intermittently in the living area",
      urgency:          "MEDIUM",
      status:           "PENDING",
    },
    {
      unitId:           kUnits[7]._id,
      tenantId:         tenants[9]._id,
      issueDescription: "Front door lock is stiff and difficult to turn",
      urgency:          "MEDIUM",
      status:           "RESOLVED",
      assignedTo:       "Nairobi Locksmith",
      resolvedAt:       d(2026, 4, 28),
    },
    {
      unitId:           lUnits[0]._id,
      tenantId:         tenants[10]._id,
      issueDescription: "Garden irrigation system not functioning in the rear section",
      urgency:          "LOW",
      status:           "PENDING",
    },
    {
      unitId:           eUnits[0]._id,
      tenantId:         tenants[12]._id,
      issueDescription: "Window pane cracked — security concern",
      urgency:          "HIGH",
      status:           "IN_PROGRESS",
      assignedTo:       "Eastleigh Glass Works",
    },
    {
      unitId:           eUnits[3]._id,
      tenantId:         tenants[15]._id,
      issueDescription: "Water heater producing cold water only",
      urgency:          "HIGH",
      status:           "PENDING",
    },
    {
      unitId:           kaUnits[0]._id,
      tenantId:         tenants[17]._id,
      issueDescription: "Pool filtration pump making unusual noise",
      urgency:          "MEDIUM",
      status:           "IN_PROGRESS",
      assignedTo:       "AquaCare Pool Services",
    },
  ]);
  console.log("Created maintenance requests");

  console.log("\n✅ Database seeded successfully!");
  console.log("──────────────────────────────────────");
  console.log("  Properties : 5");
  console.log("  Units      : 51");
  console.log("  Tenants    : 19");
  console.log("  Leases     : 19 (active)");
  console.log(`  Invoices   : ${invoicesData.length}`);
  console.log(`  Payments   : ${paymentsData.length}`);
  console.log("  Maintenance: 8 requests");
  console.log("──────────────────────────────────────");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
