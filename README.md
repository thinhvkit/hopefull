# Hopeful - Telehealth Therapy Platform

A comprehensive telehealth platform connecting users with licensed therapists for video sessions, appointment booking, and mental wellness support.

## Tech Stack

- **Mobile App**: React Native with Expo
- **Admin Panel**: React + Vite + TailwindCSS
- **Backend API**: NestJS + Prisma
- **Database**: PostgreSQL
- **Video Calls**: Daily.co (HIPAA compliant)
- **Payments**: Stripe
- **Push Notifications**: Firebase Cloud Messaging

## Project Structure

```
hopeful/
├── apps/
│   ├── api/           # NestJS backend
│   ├── mobile/        # React Native Expo app
│   ├── admin/         # React admin panel
│   └── web/           # Marketing website (coming soon)
├── packages/
│   ├── types/         # Shared TypeScript types
│   ├── utils/         # Shared utilities
│   ├── config/        # Shared configurations
│   └── ui/            # Shared UI components
└── package.json
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 15+
- Expo CLI (for mobile development)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy the example env file and update with your values:

```bash
cp apps/api/.env.example apps/api/.env
```

### 3. Set up the database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### 4. Start development servers

```bash
# Start all apps
pnpm dev

# Or start individually
pnpm api:dev      # Backend API on http://localhost:3001
pnpm admin:dev    # Admin panel on http://localhost:3000
pnpm mobile:dev   # Mobile app with Expo
```

## Development

### Backend API

- **URL**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Tech**: NestJS, Prisma, PostgreSQL

### Mobile App

- **Tech**: React Native, Expo, Zustand
- Run `pnpm mobile:dev` and scan QR with Expo Go app

## Key Features

### For Users
- User/Therapist account types
- OTP verification (SMS/Email)
- Social login (Google, Apple)
- Therapist discovery & search
- Appointment booking with calendar
- Video sessions
- Payment management
- Push notifications

### For Therapists
- Profile verification
- Availability management
- Booking management
- Video sessions with notes
- Earnings dashboard
- Payout settings

### For Admins
- User management
- Therapist verification
- Appointment oversight
- Payment management
- Analytics & reporting

## Database Schema

The Prisma schema includes models for:
- Users & Authentication
- Therapists & Verification
- Appointments & Scheduling
- Payments & Payouts
- Reviews & Feedback
- Notifications
- Support Tickets

## API Documentation

Once running, visit http://localhost:3001/api/docs for Swagger documentation.

## License

Private - All rights reserved
