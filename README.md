# Swift RCMS

**Swift Rent Collection and Management System** — a full-stack property management platform for landlords and property managers. Swift RCMS centralises tenant management, rent collection, lease administration, maintenance tracking, and financial reporting into a single operational system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Modules](#modules)
- [Real-Time Infrastructure](#real-time-infrastructure)
- [Authentication & Access Control](#authentication--access-control)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)

---

## Overview

Swift RCMS supports three distinct user roles — **Landlord**, **Property Manager**, and **Tenant** — each with scoped access to the system. Landlords own and configure properties; property managers operate properties on their behalf; tenants receive invoices, make payments, and raise maintenance requests.

Core capabilities:
- Multi-property portfolio management with unit-level tracking
- Automated invoice generation and rent collection
- Tenant and lease lifecycle management
- Structured maintenance request workflows
- Real-time in-app, email, and SMS notifications
- Financial reporting: income, arrears, and occupancy

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | MongoDB via Mongoose ODM |
| Cache | Redis |
| Authentication | JWT (access + refresh tokens), OTP via email/SMS |
| Payments | M-Pesa STK Push (Safaricom Daraja API) |
| Email | Nodemailer (SMTP) |
| SMS | Africa's Talking |
| Maps | Google Maps (`@vis.gl/react-google-maps`) |
| UI | shadcn/ui, Radix UI, Tailwind CSS v4 |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Validation | Zod |
| Real-Time | Server-Sent Events (SSE) with Node.js EventEmitter |

---

## Architecture

Swift RCMS is a monolithic Next.js application. The frontend and backend co-exist within the same repository — the App Router's route handlers serve as the API layer, and the React client consumes them directly.

```
Browser (React / Next.js Client)
        │
        ▼
Next.js App Router
├── /app/(portal)      → Protected dashboard pages
├── /app/auth          → Authentication pages
├── /app/invite        → Manager invitation acceptance
└── /app/api           → REST API route handlers
        │
        ▼
Business Logic Layer
├── /lib/models        → Mongoose schemas
├── /lib/services      → Email, SMS, auth services
├── /lib/utils         → Auth helpers, API response wrappers
└── /lib/inviteEmitter → Module-level EventEmitter for SSE pub/sub
        │
        ▼
Data Layer
├── MongoDB            → Primary data store
└── Redis              → Session cache, OTP storage
```

---

## Modules

### Authentication

Handles the full user identity lifecycle.

---

### User Management

Three roles with distinct permissions:

| Role | Capabilities |
|---|---|
| `LANDLORD` | Full property ownership, billing configuration, manager assignment |
| `PROPERTY_MANAGER` | Operational access to assigned properties |
| `TENANT` | Invoice viewing, payment initiation, maintenance requests |

---

### Property Management

Properties are the top-level organisational unit. Each property contains:

- **Metadata** — name, description, cover photo
- **Location** — physical address, city, county, country, GPS coordinates (Google Maps pin)
- **Unit types** — configurable bedroom/bathroom combinations with counts
- **Billing configuration** — rent due day, accepted payment methods
- **Contacts** — on-site contacts (caretakers, security, etc.)
- **Property Manager** — assigned via a formal invite flow (see [Manager Invitation Flow](#manager-invitation-flow))

---

### Unit Management

Individual lettable units within a property.

- Linked to a parent property
- Tracks rent amount, deposit amount, bedroom/bathroom count
- Occupancy status: `VACANT` or `OCCUPIED` (updated automatically on lease events)


---

### Tenant Management

Tenant profiles extend the base user record with tenancy-specific data: national ID number and emergency contact details. Tenants are linked to active leases.

---

### Lease Management

A lease binds a tenant to a unit for a defined period.

- Records start/end dates, monthly rent, deposit paid, and lease document URL
- Status transitions: `ACTIVE` → `EXPIRED` (date-driven) or `TERMINATED` (manual)
- Terminating a lease marks the associated unit as `VACANT`


---

### Invoicing

Invoices are generated per lease per billing cycle.

- Stores billing period, due date, base amount, and late fee
- Status transitions: `PENDING` → `PAID` or `OVERDUE`
- Supports bulk auto-generation across active leases


---

### Payments

Payment records are linked to leases and invoices.

- Supported methods: M-Pesa, bank transfer
- M-Pesa payments are initiated via **STK Push**: the system triggers a payment prompt directly on the tenant's phone
- M-Pesa callbacks update payment and invoice status asynchronously
- Transaction receipts stored for reconciliation

---

### Maintenance

Tenants raise maintenance requests against their unit. Requests carry:

- Issue description and urgency (`LOW`, `MEDIUM`, `HIGH`)
- Optional photo attachment
- Status workflow: `PENDING` → `IN_PROGRESS` → `RESOLVED`
- Assignment to a responsible party with a resolution timestamp


---

### Manager Invitation Flow

Property manager assignment is a structured, consent-based flow rather than a direct assignment.

1. **Landlord selects a manager** — triggers a password confirmation dialog to verify identity.
2. **Invite sent** — a signed token is generated with a configurable TTL. The manager receives an email with an acceptance link, an SMS, and an in-app notification.
3. **Pending invite indicator** — the landlord's property page shows a live pending invite status. The manager selector is disabled until the invite resolves.
4. **Manager accepts** — visits the invite URL, authenticates if needed, and accepts. The property's manager field is updated instantly.
5. **Real-time resolution** — the landlord's page updates without a refresh via SSE (see [Real-Time Infrastructure](#real-time-infrastructure)).
6. **Confirmation notifications** — both parties receive email, SMS, and in-app confirmation.
7. **Removal** — the landlord can remove the manager at any time; the removed manager receives an in-app notification immediately.


---

### Notifications

A unified notification system that delivers messages in-app, via email, and via SMS.

In-app notifications are stored in MongoDB and streamed to the browser in real time via SSE. The notification bell in the nav header shows an unread count and updates live without polling.

---

### Reporting

Three core financial and operational reports:

| Report | Description |
|---|---|
| **Income** | Rent collected vs. expected per period |
| **Arrears** | Outstanding balances across tenants |
| **Occupancy** | Occupied vs. vacant units across properties |


---

## Project Structure

```
swift_rcms/
├── app/
│   ├── (portal)/               # Protected dashboard (layout-gated by auth)
│   │   ├── dashboard/
│   │   ├── properties/
│   │   ├── units/
│   │   ├── tenants/
│   │   ├── payments/
│   │   ├── invoices/
│   │   ├── maintenance/
│   │   ├── arrears/
│   │   └── settings/
│   ├── auth/                   # Public auth pages (login, register, reset)
│   ├── invite/[token]/         # Manager invitation acceptance page
│   └── api/                    # API route handlers
│       ├── auth/
│       ├── users/
│       ├── properties/
│       ├── units/
│       ├── tenants/
│       ├── leases/
│       ├── invoices/
│       ├── payments/
│       ├── mpesa/
│       ├── maintenance/
│       ├── notifications/
│       ├── reports/
│       └── invite/
├── components/
│   ├── ui/                     # shadcn/ui base components
│   └── *.tsx                   # Feature components (nav, forms, charts, modals)
├── lib/
│   ├── models/                 # Mongoose schemas
│   ├── services/               # Email, SMS, auth services
│   ├── middleware/             # Auth, authorization, validation
│   ├── utils/                  # Auth helpers, API response, createNotification
│   ├── db.ts                   # MongoDB connection
│   ├── redis.ts                # Redis client
│   └── inviteEmitter.ts        # SSE EventEmitter bus
└── public/
    ├── images/
    └── uploads/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Redis instance
- SMTP credentials
- Africa's Talking account (SMS)
- Safaricom Daraja API credentials (M-Pesa)
- Google Maps API key

### Installation

```bash
git clone <repository-url>
cd swift_rcms
npm install
```

### Development

```bash
cp .env.example .env.local
# Fill in your environment variables
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

---

