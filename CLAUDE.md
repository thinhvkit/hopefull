# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Start all apps in dev mode
pnpm dev

# Start individual apps
pnpm api:dev      # Backend API on http://localhost:3001
pnpm admin:dev    # Admin panel on http://localhost:3000
pnpm mobile:dev   # Mobile app with Expo

# Build all apps
pnpm build

# Lint all apps
pnpm lint
```

## Database Commands

```bash
pnpm db:generate  # Generate Prisma client after schema changes
pnpm db:push      # Push schema to database (dev)
pnpm db:migrate   # Create and run migrations
pnpm db:studio    # Open Prisma Studio GUI
```

## Testing

```bash
# Run tests (via Turborepo)
pnpm test

# API-specific testing
cd apps/api
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:cov          # Coverage report
```

## Architecture Overview

This is a **pnpm monorepo** managed by **Turborepo** with four apps and shared packages.

### Apps

| App | Tech Stack | Port | Package Name |
|-----|------------|------|--------------|
| `apps/api` | NestJS, Prisma, PostgreSQL | 3001 | @hopefull/api |
| `apps/admin` | React, Vite, TailwindCSS | 3000 | @hopefull/admin |
| `apps/mobile` | React Native, Expo | - | @hopefull/mobile |
| `apps/web` | (placeholder) | - | @hopefull/web |

### Shared Packages

- `packages/types` - TypeScript types shared across apps

### Backend Structure (NestJS)

The API follows NestJS module pattern:
- `src/auth/` - JWT authentication, local/social strategies, guards, OTP verification
- `src/users/` - User CRUD and profile management
- `src/therapists/` - Therapist discovery, availability, reviews
- `src/appointments/` - Booking, scheduling, cancellation
- `src/payments/` - Payment methods, transactions, Stripe integration
- `src/prisma/` - Global Prisma service for database access
- `src/firebase/` - Firebase Admin SDK for phone verification

Key patterns:
- Global `PrismaModule` provides database access to all modules
- `JwtAuthGuard` protects authenticated routes
- `RolesGuard` with `@Roles()` decorator for role-based access
- DTOs use `class-validator` decorators for validation
- Swagger decorators on controllers generate API docs at `/api/docs`

#### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register new user, sends 6-digit OTP |
| `/api/v1/auth/login` | POST | Login with email/password |
| `/api/v1/auth/verify-otp` | POST | Verify 6-digit OTP code |
| `/api/v1/auth/resend-otp` | POST | Resend OTP to user |
| `/api/v1/auth/verify-phone` | POST | Verify phone via Firebase ID token |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/auth/me` | GET | Get current user profile |

### Mobile Structure (Expo Router)

File-based routing with Expo Router:
- `app/_layout.tsx` - Root layout with providers
- `app/index.tsx` - Welcome/landing screen
- `app/onboarding.tsx` - Onboarding carousel
- `app/auth/` - Login, register, OTP verification, forgot password flows
- `app/(tabs)/` - Main app tabs (Home, Appointments, Therapists, Profile)
- `app/therapist/` - Therapist detail and booking screens

State management:
- `src/store/auth.ts` - Zustand store for auth state and onboarding
- `src/services/api.ts` - Axios instance with token interceptors
- `src/config/firebase.ts` - Firebase client SDK configuration
- Tokens stored in `expo-secure-store`
- Onboarding flag stored in `AsyncStorage` (SecureStore unreliable on Android)

#### Registration Flow
1. User fills registration form (2 steps: personal info → password)
2. API creates user and generates 6-digit OTP (logged to console in dev)
3. Mobile navigates to OTP screen with Firebase Phone Auth
4. Firebase sends SMS via reCAPTCHA verification
5. User enters OTP, Firebase verifies, returns ID token
6. Mobile calls `/auth/verify-phone` with ID token
7. API verifies token, links phone to user, returns JWT tokens

### Admin Panel Structure

React Router with protected routes:
- `src/pages/` - Page components by feature
- `src/components/layout/Layout.tsx` - Sidebar navigation shell
- `src/store/auth.ts` - Zustand with persist middleware
- Uses TailwindCSS utility classes with `cn()` helper for merging

### Database Schema

PostgreSQL with Prisma ORM. Key models in `apps/api/prisma/schema.prisma`:
- **User** - All users (USER, THERAPIST, ADMIN roles)
- **Therapist** - Extended profile linked to User, includes verification status
- **Appointment** - Bookings with status workflow (PENDING → CONFIRMED → COMPLETED)
- **Payment** - Stripe integration, tracks amounts in cents
- **Review** - 1-5 star ratings with optional feedback

All monetary values stored as integers (cents). Timestamps use `@default(now())` and `@updatedAt`.

## Environment Variables

### API (`apps/api/.env`)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hopefull?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1d"

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Mobile (`apps/mobile/.env`)

```bash
# Firebase Client SDK
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Phone Authentication** in Authentication → Sign-in method
3. Add test phone numbers for development (optional)
4. Download service account JSON for API (Project Settings → Service accounts)
5. Get web config for mobile (Project Settings → General → Your apps)
