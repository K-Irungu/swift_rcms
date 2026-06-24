# Swift RCMS

**Swift Rent Collection and Management System** — a full-stack property management platform for landlords and property managers. Swift RCMS centralises tenant management, rent collection, lease administration, maintenance tracking, and financial reporting into a single operational system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)

---

## Overview

Swift RCMS supports three distinct user roles: **Landlord**, **Property Manager**, and **Tenant**, each with scoped access to the system. Landlords own and configure properties; property managers operate properties on their behalf; tenants receive invoices, make payments, and raise maintenance requests.

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
git clone https://github.com/K-Irungu/swift_rcms.git
cd swift_rcms
npm install
```

