# Swift RCMS

Property management SaaS for the Kenyan market.

## Tech Stack
- Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- MongoDB Atlas, Redis, BullMQ
- Resend (email), Vercel (hosting)

## Prerequisites
- Node.js 18+
- MongoDB Atlas connection string
- Redis instance (Upstash or local)
- Resend API key

## Getting Started

1. Clone the repo
2. Install dependencies
   npm install
3. Copy environment variables
   cp .env.example .env
4. Run the development server
   npm run dev

## Environment Variables
See .env.example for all required variables.

## Project Structure
src/
  app/          → Next.js app router pages and API routes
  lib/
    models/     → MongoDB schemas
    services/   → Business logic
    queues/     → BullMQ queue definitions
    workers/    → BullMQ workers
    utils/      → Shared utilities
    middleware/ → Route middleware

## Scripts
npm run dev        → Start development server
npm run worker     → Start BullMQ worker
npm run dev:all    → Start server and worker together
npm run build      → Production build
npm run lint       → Run ESLint