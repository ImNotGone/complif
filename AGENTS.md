# AGENTS.md

## Project Overview
Business Onboarding Portal - A full-stack application for managing company onboarding with automated risk assessment, document management, and approval workflows.

**Tech Stack:**
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Auth: JWT with refresh tokens
- Storage: AWS S3 (documents)

**Repository Structure:**
```
├── onboarding-api/      # Backend (NestJS)
├── onboarding-frontend/ # Frontend (Next.js)
├── infrastructure/      # Terraform configuration
└── questions.md         # Design decisions & assumptions
```

---

## Architecture Overview

### Backend Architecture (onboarding-api/)
```
onboarding-api/
├── prisma/
│   ├── migrations/          # Database migrations history
│   ├── schema.prisma        # Database schema (source of truth)
│   └── seed.ts              # Seed data (admin/viewer users, sample businesses)
│
├── src/
│   ├── main.ts              # App bootstrap, Swagger config, CORS
│   ├── app.module.ts        # Root module (imports all feature modules)
│   ├── app.controller.ts    # Health check endpoint (/)
│   ├── app.service.ts       # App-level services
│   │
│   ├── prisma.service.ts    # Prisma client singleton
│   ├── prisma.module.ts     # Prisma module (global)
│   │
│   ├── auth/                # Authentication & Authorization
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts       # Token generation, user validation
│   │   ├── auth.controller.ts    # Login, refresh, logout, /me
│   │   │
│   │   ├── strategies/
│   │   │   ├── jwt-auth.strategy.ts      # Access token validation (15min)
│   │   │   └── jwt-refresh.strategy.ts   # Refresh token validation (7d)
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts         # Access token guard
│   │   │   ├── jwt-refresh.guard.ts      # Refresh token guard
│   │   │   └── roles.guard.ts            # Role-based access control
│   │   │
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts       # @Public() - skip auth
│   │   │   ├── auth.decorator.ts         # @AuthenticatedOnly()
│   │   │   ├── admin.decorator.ts        # @AdminOnly()
│   │   │   ├── refresh.decorator.ts      # @RefreshOnly()
│   │   │   └── roles.decorator.ts        # @Roles()
│   │   │
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       ├── login-response.dto.ts
│   │       └── current-user-response.dto.ts
│   │
│   ├── businesses/          # Core business onboarding logic
│   │   ├── businesses.module.ts
│   │   ├── businesses.service.ts       # CRUD, risk triggers, stats
│   │   ├── businesses.controller.ts    # REST endpoints
│   │   ├── risk-engine.service.ts      # Risk calculation algorithm
│   │   │
│   │   └── dto/
│   │       ├── create-business.dto.ts
│   │       ├── update-business.dto.ts
│   │       ├── change-business-status.dto.ts
│   │       ├── find-business-query.dto.ts
│   │       ├── business-response.dto.ts
│   │       ├── paginated-business-response.dto.ts
│   │       ├── status-history-response.dto.ts
│   │       ├── recalculate-risk-response.dto.ts
│   │       └── user.dto.ts
│   │
│   └── documents/           # Document management
│       ├── documents.module.ts
│       ├── documents.service.ts        # Upload, list, delete
│       ├── documents.controller.ts     # Document endpoints
│       ├── s3.service.ts              # AWS S3 integration (mock/real)
│       │
│       └── dto/
│           └── upload-document.dto.ts
│
├── test/                    # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── docker-compose.yml       # PostgreSQL container
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### Frontend Architecture (onboarding-frontend/)
```
onboarding-frontend/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout, toast provider
│   ├── page.tsx             # Home (redirects based on auth)
│   ├── globals.css          # Global styles, Tailwind
│   │
│   ├── login/
│   │   └── page.tsx         # Login form
│   │
│   └── dashboard/
│       ├── layout.tsx       # Dashboard layout with navbar, logout
│       ├── page.tsx         # Business list, filters, stats cards
│       │
│       └── businesses/
│           ├── new/
│           │   └── page.tsx # Create business form
│           │
│           └── [id]/
│               └── page.tsx # Business detail with tabs:
│                            # - Overview (info + risk breakdown)
│                            # - Status Timeline (history)
│                            # - Risk History (calculations)
│                            # - Documents (upload/download)
│
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   └── textarea.tsx
│   │
│   ├── change-status-dialog.tsx    # Modal to change business status
│   └── upload-document-dialog.tsx  # Modal to upload documents
│
├── lib/
│   ├── api/
│   │   ├── client.ts        # Axios instance with refresh interceptor
│   │   └── services.ts      # API functions (authApi, businessesApi, documentsApi)
│   │
│   ├── types/
│   │   └── api.ts           # TypeScript interfaces from OpenAPI
│   │
│   ├── store/
│   │   └── auth-store.ts    # Zustand auth state (tokens, user)
│   │
│   ├── constants/
│   │   └── countries.ts     # Country list for dropdowns
│   │
│   └── utils.ts             # Utility functions (cn for className merging)
│
├── public/                  # Static assets
│   └── *.svg
│
├── middleware.ts            # Auth middleware (redirects)
├── components.json          # shadcn/ui config
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```

---

## Key Concepts & Business Rules

### 1. Risk Calculation Engine
**Location:** `onboarding-api/src/businesses/risk-engine.service.ts`

**Algorithm (0-100 score):**
- **Country Risk:** 50 points if high-risk (PA, VG, KY, CH, LI, MC)
- **Industry Risk:** 30 points if high-risk (construction, security, casino, money_exchange, gambling, cryptocurrency)
- **Document Risk:** 20 points if ANY required document missing

**Required Documents (3 total):**
- `TAX_CERTIFICATE`
- `REGISTRATION`
- `INSURANCE_POLICY`
- `OTHER` (unlimited, doesn't count toward required 3)

**Initial Status Determination:**
- Score > 70 → `IN_REVIEW`
- Score ≤ 70 → `PENDING`

**Auto-Recalculation Triggers:**
1. Business creation (initial calc)
2. Country or industry update
3. Any of the required documents gets uploaded or deleted
4. Manual recalc endpoint (admin only)

### 2. Document Management Rules
**Location:** `onboarding-api/src/documents/documents.service.ts`

**Constraints:**
- **One document per required type** (TAX_CERTIFICATE, REGISTRATION, INSURANCE_POLICY)
- **Unlimited OTHER documents**
- **Only PDFs < 10Mb allowed** (MIME type validation)
- **Soft delete** (deletedAt timestamp, not hard delete)

**Why?** Preserves audit trail and allows risk calculations to reference historical data.

**Risk Recalc Logic:**
```typescript
shouldRecalculateRisk(action, document):
  return (action === 'upload' || action === 'delete') && this.REQUIRED_DOCUMENT_TYPES.includes(document.type)
```

### 3. Authentication Flow
**Location:** `onboarding-api/src/auth/`

**Two JWT Tokens (both are JWTs, no DB storage):**
- **Access Token:** 15 minutes, uses `JWT_SECRET`
- **Refresh Token:** 7 days, uses `JWT_REFRESH_SECRET` (must differ!)

**Two Strategies:**
- `JwtAuthStrategy`: Validates access tokens (used by most endpoints)
- `JwtRefreshStrategy`: Validates refresh tokens (only /auth/refresh && /auth/logout)

**Decorators:**
- `@Public()` - Skip access token auth entirely (login, refresh, logout)
- `@AuthenticatedOnly()` - Require valid access token (its the default on all endpoints. Public endpoints have to be explicitly anotated)
- `@AdminOnly()` - Require ADMIN role + valid access token
- `@RefreshOnly()` - Require valid refresh token (refresh, logout)

**Access Token Payload:**
```typescript
{
  sub: string,              // userId
  email: string,
  role: 'ADMIN' | 'VIEWER'
}
```
**Refresh Token Payload:**
```typescript
{
    sub: string,            // userId
    email: string,
    tokenVersion: number    // used to invalidate tokens on logout
}
```
**Logout:** 
- The logout endpoint is only accessible with a refresh token. It invalidates all current refresh tokens by incrementing the token version on the db

### 4. Database Schema Key Relationships
**Location:** `onboarding-api/prisma/schema.prisma`

```
User (1) ──creates──> (N) Business
User (1) ──updates──> (N) Business

Business (1) ──has──> (N) Document
Business (1) ──has──> (N) StatusHistory
Business (1) ──has──> (N) RiskCalculation

Composite Unique: Business[taxId + country]
```

**Audit Trail - All mutations track:**
- `createdBy` / `createdById`
- `updatedBy` / `updatedById`
- `changedBy` / `changedById` (refering to business status)

**Soft Deletes:**
- Documents have `deletedAt` field
- Allows historical risk calculations to remain valid

---

## Common Tasks & Solutions

### Adding a New Backend Endpoint

1. **Create DTO** (`src/module/dto/my-dto.ts`)
```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MyDto {
  @ApiProperty({ example: 'value', description: 'Field description' })
  @IsString()
  @IsNotEmpty()
  field: string;
}
```

2. **Add Service Method** (`src/module/module.service.ts`)
```typescript
async myMethod(dto: MyDto, userId: string) {
  this.logger.log(`Performing action: ${dto.field} by user ${userId}`);
  
  const result = await this.prisma.model.create({ 
    data: {
      ...dto,
      createdBy: { connect: { id: userId } },
    },
  });
  
  return result;
}
```

3. **Add Controller Endpoint** (`src/module/module.controller.ts`)
```typescript
import { AuthenticatedOnly } from '../auth/decorators/auth.decorator';

@AuthenticatedOnly()
@Post('my-endpoint')
@ApiOperation({ summary: 'My endpoint description' })
@ApiOkResponse({ description: 'Success', type: MyResponseDto })
@ApiBadRequestResponse({ description: 'Invalid input' })
async myEndpoint(@Body() dto: MyDto, @Req() req: any) {
  const userId = req.user.userId;
  return this.service.myMethod(dto, userId);
}
```

### Adding a New Frontend Page

1. **Create Page** (`app/my-page/page.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { myApi } from '@/lib/api/services';
import { Button } from '@/components/ui/button';

export default function MyPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      const result = await myApi.getData();
      setData(result);
    };
    fetchData();
  }, []);
  
  return <div>My Page Content</div>;
}
```

2. **Add API Function** (`lib/api/services.ts`)
```typescript
export const myApi = {
  getData: async (): Promise<MyData> => {
    const response = await apiClient.get('/my-endpoint');
    return response.data;
  },
  
  createData: async (data: MyDto): Promise<MyData> => {
    const response = await apiClient.post('/my-endpoint', data);
    return response.data;
  },
};
```

3. **Add TypeScript Type** (`lib/types/api.ts`)
```typescript
export interface MyDto {
  field: string;
}

export interface MyData {
  id: string;
  field: string;
  createdAt: string;
}
```

### Modifying Risk Calculation

**File:** `onboarding-api/src/businesses/risk-engine.service.ts`

**Change high-risk lists:**
```typescript
private readonly HIGH_RISK_COUNTRIES = ['PA', 'VG', 'KY', 'CH', 'LI', 'MC'];
private readonly HIGH_RISK_INDUSTRIES = [
  'construction',
  'security',
  'casino',
  'money_exchange',
  'gambling',
  'cryptocurrency',
];
```

**Adjust scoring weights:**
```typescript
  private readonly COUNTRY_RISK = 40;
  private readonly INDUSTRY_RISK = 30;
  private readonly MISSING_DOCUMENTS_RISK = 20;
}
```

**Change status threshold:**
```typescript
  private readonly HIGH_RISK_THRESHOLD = 70;
```

### Adding a New Business Status

1. **Update Prisma Enum** (`prisma/schema.prisma`)
```prisma
enum BusinessStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
  UNDER_INVESTIGATION  // Add new status
}
```

2. **Create and Run Migration**
```bash
cd onboarding-api/
npx prisma migrate dev --name add-under-investigation-status
```

3. **Update Frontend Constants** (`onboarding-frontend/app/dashboard/page.tsx`)
```typescript
const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  UNDER_INVESTIGATION: 'bg-orange-100 text-orange-800', // Add new
};
```

4. **Update Status Icons** (if needed)
```typescript
const STATUS_ICONS = {
  PENDING: Clock,
  IN_REVIEW: AlertCircle,
  APPROVED: CheckCircle,
  REJECTED: AlertCircle,
  UNDER_INVESTIGATION: Search, // Add new icon
};
```

### Adding a New Country to High-Risk List

**File:** `onboarding-api/src/businesses/risk-engine.service.ts`
```typescript
private readonly HIGH_RISK_COUNTRIES = [
  'PA', 'VG', 'KY', 'CH', 'LI', 'MC',
  'XY', // Add new country code
];
```

Then test:
```bash
# Create a business with new country
curl -X POST http://localhost:3000/businesses \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test","taxId":"12345678","country":"XY","industry":"software"}'
  
# Check that riskScore includes country risk (50 points)
```

---

## Data Flow Examples

### 1. User Login → Tokens → Dashboard
```
Frontend: POST /auth/login { email, password }
  ↓
Backend: AuthController.login()
  ↓
AuthService.validateUser() → bcrypt.compare(password, hashedPassword)
  ↓
AuthService.login() → Generate 2 JWTs:
  - Access token (15min, JWT_SECRET)
  - Refresh token (7d, JWT_REFRESH_SECRET)
  ↓
Frontend: Store both tokens in localStorage
  ↓
Frontend: GET /auth/me (with access token)
  ↓
Backend: JwtAuthGuard validates token → req.user = { userId, email, role }
  ↓
AuthService.getCurrentUser(userId) → Return user data
  ↓
Frontend: Update Zustand store → Redirect to /dashboard
```

### 2. Create Business → Risk Calculation → Status Assignment
```
POST /businesses { name, taxId, country, industry }
  ↓
BusinessesController.create()
  ↓
BusinessesService.create()
  ↓
1. validateTaxIdExternal() → Mock validation (TODO: real microservice)
2. Check duplicate (taxId + country unique)
  ↓
3. RiskEngineService.calculateRisk(country, industry, [])
   - documents = [] because none uploaded yet
   - Returns: { totalScore: 60, countryRisk: 40, industryRisk: 0, documentRisk: 20 }
  ↓
4. RiskEngineService.determineInitialStatus(60)
   - 60 ≤ 70 → PENDING
  ↓
5. Prisma: Create Business + StatusHistory + RiskCalculation in one transaction
  ↓
Return BusinessResponseDto with riskScore: 60, status: PENDING
```

### 3. Upload Document → Conditional Risk Recalc
```
POST /businesses/:id/documents/upload
  FormData: { type: 'TAX_CERTIFICATE', file: pdf }
  ↓
DocumentsController.uploadDocument()
  ↓
DocumentsService.uploadDocument()
  ↓
1. Verify business exists
2. Validate PDF file (MIME type)
3. Check if this required type already exists → Reject if duplicate
  ↓
4. S3Service.uploadFile() → Upload to S3 (or mock)
   - Generate s3Key: businesses/{businessId}/{type}/{timestamp}-{filename}
   - Generate presigned URL (1 hour expiry)
  ↓
5. Prisma: Create Document record
  ↓
6. recalculateRisk
  ↓
7. IF IT IS A REQUIRED DOCUMENT:
    BusinessesService.recalculateRisk(businessId)
   - Fetch business + all documents
   - RiskEngineService.calculateRisk()
   - Update Business.riskScore
   - Create new RiskCalculation record
  ↓
Return Document with metadata
```

### 4. Token Refresh Flow (Frontend Auto-Refresh)
```
User makes API request with expired access token
  ↓
API returns 401 Unauthorized
  ↓
Axios Interceptor catches error
  ↓
Check if already refreshing:
  - If yes → Queue this request
  - If no → Start refresh process
  ↓
POST /auth/refresh { refresh_token: "..." }
  ↓
Backend: JwtRefreshGuard validates refresh token
  - Extract token from request body
  - Verify signature using JWT_REFRESH_SECRET
  - Check expiration (7 days)
  ↓
JwtRefreshStrategy.validate()
  - Verify user still exists in DB
  - Verify token version to make sure its not expired
  - Return user data
  ↓
AuthService.refreshAccessToken(user)
  - Generate new access token (15min)
  ↓
Frontend: Receive { access_token: "new...", expires_in: 900 }
  ↓
Update localStorage.access_token
Update Authorization header
  ↓
Retry all queued requests with new token
```

### 5. Change Business Status → History Entry → Notification
```
PATCH /businesses/:id/status { status: 'APPROVED', reason: 'All docs verified' }
  ↓
BusinessesController.changeStatus()
  ↓
BusinessesService.changeStatus()
  ↓
1. Fetch business
2. Check if status is different (prevent duplicate)
  ↓
3. Prisma: Update Business.status
4. Prisma: Create StatusHistory entry
   - status: APPROVED
   - changedById: req.user.userId
   - reason: 'All docs verified'
  ↓
5. Log mock notification:
   "NOTIFICATION: Business 'Acme Corp' status changed from PENDING to APPROVED"
   (TODO: Implement real webhook/email service)
  ↓
Return updated Business
```

---

## Environment Variables

### Backend (.env in onboarding-api/)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/onboarding"

# JWT Secrets (MUST be different!)
JWT_SECRET="your-super-secret-access-token-key-change-in-production"
JWT_REFRESH_SECRET="your-different-refresh-token-key-change-in-production"

# AWS S3 (Optional - for real file uploads)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET_NAME="onboarding-documents"

# Server
PORT=3000
NODE_ENV="development"
```

### Frontend (.env.local in onboarding-frontend/)
```bash
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## Testing & Development

### Backend Setup & Development
```bash
cd onboarding-api/

# Install dependencies
npm install

# Start PostgreSQL with Docker
docker-compose up -d

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database (creates admin/viewer users + sample businesses)
npx prisma db seed

# Start dev server
npm run start:dev

# API docs available at: http://localhost:3000/api
```

### Frontend Setup & Development
```bash
cd onboarding-frontend/

# Install dependencies
npm install

# Start dev server
npm run dev

# Access at: http://localhost:3001
```

### Test Users (from seed data)
```
Admin:  admin@complif.com  / complif_admin
Viewer: viewer@complif.com / complif_viewer
```

### Running Tests
```bash
# Backend unit tests
cd onboarding-api/
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend (if tests are added)
cd onboarding-frontend/
npm run test
```

---

## API Endpoints Reference

### Auth Module
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Login (returns access + refresh tokens) |
| POST | `/auth/refresh` | Refresh Token | Refresh access token |
| POST | `/auth/logout` | Public | Increments refresh token version |
| GET | `/auth/me` | Access Token | Get current user info |

### Businesses Module
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/businesses` | Access Token | Create business (auto-calculates risk) |
| GET | `/businesses` | Access Token | List with filters, pagination, global stats |
| GET | `/businesses/:id` | Access Token | Get business details |
| PATCH | `/businesses/:id` | Admin | Update business info |
| PATCH | `/businesses/:id/status` | Admin | Change status (creates status history entry) |
| GET | `/businesses/:id/status-history` | Access Token | Get status timeline |
| GET | `/businesses/:id/risk-history` | Access Token | Get risk calculation history |
| POST | `/businesses/:id/risk/calculate` | Admin | Manual risk recalculation |

### Documents Module
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/businesses/:id/documents/upload` | Access Token | Upload PDF (triggers risk recalc if needed) |
| GET | `/businesses/:id/documents` | Access Token | List documents for a business |
| GET | `/businesses/:id/documents/:docId` | Access Token | Get document with fresh presigned URL |
| DELETE | `/businesses/:id/documents/:docId` | Admin | Soft delete document (triggers risk recalc if needed) |

**Query Parameters for GET /businesses:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `status` (enum: PENDING | IN_REVIEW | APPROVED | REJECTED)
- `country` (string, 2-letter code)
- `search` (string, searches name and taxId)

**Response Format:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  },
  "stats": {
    "pending": 8,
    "inReview": 12,
    "approved": 20,
    "rejected": 2
  }
}
```

---

## Troubleshooting

### Prisma Client errors / "Type 'X' is not assignable"
**Cause:** Prisma Client out of sync with schema
**Solution:**
```bash
cd onboarding-api/
npx prisma generate
```

### Cannot connect to database
**Cause:** PostgreSQL not running
**Solution:**
```bash
cd onboarding-api/
docker-compose up -d  # Start PostgreSQL container
```

### Port 3000 already in use
**Cause:** Another service using port 3000
**Solutions:**
- Stop other service on port 3000
- Or change backend port in `.env`: `PORT=3001`
- Update frontend API URL: `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## Security Considerations

### JWT Tokens
- **Access tokens** are short-lived (15min) to limit exposure if stolen
- **Refresh tokens** use separate secret to prevent access token forging
- **No database storage** = Stateless, horizontally scalable, no leaked token DB
- **Logout** is client-side (discard tokens) - simple and secure for stateless JWTs

### Password Hashing
- Uses `bcrypt` with salt rounds (see `prisma/seed.ts`)
- Never return password in API responses (use Prisma `select` to exclude)

### File Uploads
- **MIME type validation** - Only `application/pdf` allowed
- **File size limits** - Enforced by middleware
- **S3 presigned URLs** - Expire in 1 hour, temporary access
- **Unique s3Keys** - Format: `businesses/{id}/{type}/{timestamp}-{filename}`

### Authorization
- **Admin-only endpoints** protected with `@AdminOnly()` decorator
- **All mutations** track user who performed action (audit trail)
- **Role-based access control** via `RolesGuard`

### Input Validation
- **DTOs** use `class-validator` decorators (`@IsString()`, `@IsEmail()`, etc.)
- **Prisma** prevents SQL injection by design (parameterized queries)
- **Unique constraints** prevent duplicate businesses (`taxId + country`)

### CORS
- Configured in `main.ts` to allow frontend origin
- Adjust for production deployment

---

## Key Files for AI Agents

### Understanding Risk Logic
- `onboarding-api/src/businesses/risk-engine.service.ts` - Complete algorithm
- `onboarding-api/src/businesses/risk-engine.service.spec.ts` - Unit tests with examples

### Understanding Auth Flow
- `onboarding-api/src/auth/auth.service.ts` - Token generation
- `onboarding-api/src/auth/strategies/jwt-auth.strategy.ts` - Access token validation
- `onboarding-api/src/auth/strategies/jwt-refresh.strategy.ts` - Refresh token validation
- `onboarding-frontend/lib/api/client.ts` - Token refresh interceptor

### Understanding Document Rules
- `onboarding-api/src/documents/documents.service.ts` - Risk recalculation rules
- `onboarding-api/src/documents/s3.service.ts` - S3 integration (mock/real)

### Understanding Database Schema
- `onboarding-api/prisma/schema.prisma` - Source of truth
- `onboarding-api/prisma/migrations/` - Migration history

### Understanding Infrastructure
- `infrastructure/vpc.tf` - Networking configuration
- `infrastructure/rds.tf` - Database configuration
- `infrastructure/s3.tf` - Storage configuration
- `infrastructure/ecs.tf` - Container orchestration
- `infrastructure/iam.tf` - Security roles and policies

### Understanding API Contracts
- Visit `http://localhost:3000/api/docs` for Swagger docs (when backend running)
- Or check `*.controller.ts` files for `@ApiOperation()` decorators

### Understanding Frontend State Management
- `onboarding-frontend/lib/store/auth-store.ts` - Zustand auth state
- `onboarding-frontend/lib/api/client.ts` - Axios instance with interceptors
- `onboarding-frontend/lib/api/services.ts` - All API functions

### Understanding Business Rules & Decisions
- `questions.md` - Documents design decisions and assumptions made during development

---

## Quick Reference Commands

### Backend (onboarding-api/)
```bash
# Development
npm run start:dev          # Start backend dev server (with watch)
npm run start:debug        # Start with debugger
npm run build              # Build for production
npm run start:prod         # Start production build

# Database
npx prisma studio          # Open Prisma Studio (DB GUI)
npx prisma migrate dev     # Create and apply migration
npx prisma migrate deploy  # Apply migrations (production)
npx prisma db seed         # Seed database
npx prisma generate        # Generate Prisma Client
npx prisma migrate reset   # Reset database (⚠️ deletes all data)

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run e2e tests

# Docker
docker-compose up -d       # Start PostgreSQL
docker-compose down        # Stop PostgreSQL
docker-compose logs        # View PostgreSQL logs
```

### Frontend (onboarding-frontend/)
```bash
# Development
npm run dev                # Start frontend dev server
npm run build              # Build for production
npm run start              # Start production build
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
```

### Useful Combinations
```bash
# Fresh start (reset everything)
cd onboarding-api/
docker-compose down -v     # Stop and remove volumes
docker-compose up -d       # Start fresh DB
npx prisma migrate reset   # Reset schema
npx prisma db seed         # Seed data
npm run start:dev          # Start backend

# Check what's running
lsof -i :3000              # Check port 3000 (backend)
lsof -i :3001              # Check port 3001 (frontend)
docker ps                  # Check Docker containers
```

---

## Future Enhancements (TODO)

### High Priority
- [x] Real-time notifications via SSE + Redis pub/sub (EventsModule)
- [ ] Email notifications on status changes
- [ ] Tax ID validation microservice integration
- [ ] Rate limiting on public endpoints
- [x] File size limits on document upload

### Medium Priority
- [x] PDF preview in frontend
- [ ] Bulk business upload (CSV/Excel import)
- [ ] Advanced analytics dashboard
- [ ] Audit log viewer for admins
- [ ] Export reports (PDF, Excel)

### Low Priority
- [ ] Document OCR for automatic data extraction
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Advanced search with Elasticsearch

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker images for backend/frontend
- [ ] Terraform infrastructure files
- [ ] Production deployment guide
- [ ] Monitoring & alerting (Sentry, Datadog)

---

## Project Structure Summary

```
onboarding-portal/
│
├── onboarding-api/         # NestJS backend
│   ├── src/
│   │   ├── auth/           # JWT authentication with refresh tokens
│   │   ├── businesses/     # Core business logic + risk engine
│   │   └── documents/      # Document upload + S3 integration
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Test data
│   └── test/               # E2E tests
│
├── onboarding-frontend/    # Next.js 14 frontend
│   ├── app/                # App Router pages
│   │   ├── login/          # Login page
│   │   └── dashboard/      # Dashboard + business pages
│   ├── components/         # UI components (shadcn/ui + custom)
│   └── lib/                # API client, types, state management
│
└── questions.md            # Design decisions
```

## Real-Time Events (SSE)

**Stack:** NestJS `EventsModule` → Redis pub/sub → SSE → `useBusinessEvents` hook

**Flow:**
1. Admin changes status → `BusinessesService.changeStatus()` publishes a `StatusChangedEvent` to Redis channel `app:events`
2. All NestJS instances subscribed to the channel receive it and push it to their connected SSE clients
3. Frontend `useBusinessEvents` hook receives the event and calls `onStatusChanged`
4. `BusinessEventsListener` component checks `pendingLocalChange` — if the event is the echo of the current user's own action, it patches the store silently and skips the toast. Otherwise it shows a toast and patches the store.

**Token handling for SSE:**
The browser `EventSource` API cannot set custom headers, so the access token is
passed as `?token=<jwt>` in the URL. The `events/stream` endpoint is `@Public()`
and manually validates the token. On SSE connection error, the hook attempts a
silent token refresh via `authApi.refresh()` before reconnecting — this prevents
the infinite 401 reconnect loop that occurs when the access token expires while
the SSE connection is open.

**Business store (`business-store.ts`):**
- `businesses`: array of Business objects currently in the dashboard list
- `activeBusiness`: the single business open in the detail page
- `pendingLocalChange`: `{ businessId, newStatus }` stamped before the current user fires a status change, cleared when the SSE echo arrives
- `applyStatusChange(id, prevStatus, newStatus)`: patches both `businesses` and `activeBusiness` in one atomic update, also recalculates stats counters

Pages must call `setBusinesses()` / `setActiveBusiness()` after fetching and clear on unmount:
```typescript
useEffect(() => {
  fetchData().then(data => setActiveBusiness(data));
  return () => setActiveBusiness(null); // clear on unmount
}, [id]);
```

---

## Testing & Development

### Postman Collection

A Postman collection is available at `postman/collection.json` with all API endpoints pre-configured.

**Features:**
- Environment variables for authentication tokens
- Auto-save tokens after login
- Script to auto-refresh tokens
- Pre-request tests to verify responses

**Import:**
1. Open Postman
2. Import → `postman/collection.json`
3. Set `baseUrl` variable to `http://localhost:3000`

---

## Contact & Support

For questions or issues:
1. Check this `AGENTS.md` file (architecture & common tasks)
2. Review `questions.md` (design decisions & assumptions)
3. Check Swagger API docs at `http://localhost:3000/api/docs`
4. Check tests for usage examples

---

**Last Updated:** March 2026
**Version:** 1.1.0
**Maintainer:** Development Team