# Business Onboarding Portal

A full-stack application for managing company onboarding with automated risk assessment, document management, and approval workflows.

## Architecture Overview

The project is orchestrated using Docker Compose and consists of the following services:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                Docker Compose                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐   │
│  │   PostgreSQL │   │    Redis     │   │  LocalStack  │   │  Tax ID API │   │
│  │    :5400     │   │    :6379     │   │    :4566     │   │   :4001     │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   └─────────────┘   │
│         │                  │                  │                  │          │
│         └──────────────────┼──────────────────┼──────────────────┘          │
│                            │                  │                             │
│                    ┌───────────────┐  ┌─────────────┐                       │
│                    │  Onboarding   │  │   Frontend  │                       │
│                    │  API (:3000)  │  │   (:3001)   │                       │
│                    └───────────────┘  └─────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Description | Port | Tech |
|---------|-------------|------|------|
| **PostgreSQL** | Database for storing businesses, users, documents | 5400 | PostgreSQL 15 |
| **Redis** | In-memory cache for SSE events | 6379 | Redis 7 |
| **LocalStack** | AWS S3 mock for document storage | 4566 | LocalStack 3 |
| **Tax ID API** | External service for tax ID validation | 4001 | Node.js |
| **Onboarding API** | Main backend API | 3000 | NestJS + Prisma |
| **Frontend** | Next.js web application | 3001 | Next.js 14 |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Running the Application

The easiest way to start the entire stack:

```bash
# Run the automated script (builds, starts containers, seeds database)
./run.sh
```

Or manually:

```bash
# Start infrastructure services only
docker compose up -d postgres redis localstack

# Run Prisma migrations and seed
cd onboarding-api
npx prisma migrate dev
npx prisma db seed

# Start all services
docker compose up -d
```

### Accessing the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API Docs (Swagger) | http://localhost:3000/api/docs |
| PostgreSQL | localhost:5400 |
| LocalStack S3 | http://localhost:4566 |

### Test Users

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@complif.com | complif_admin |
| Viewer | viewer@complif.com | complif_viewer |

## Project Structure

```
complif/
├── docker-compose.yml           # Main orchestration config
├── run.sh                       # Automated setup script
│
├── onboarding-api/              # Backend (NestJS)
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Database migrations
│   ├── src/
│   │   ├── auth/               # JWT authentication
│   │   ├── businesses/         # Business CRUD + risk engine
│   │   └── documents/          # Document upload (S3)
│   ├── Dockerfile
│   └── package.json
│
├── onboarding-frontend/         # Frontend (Next.js 14)
│   ├── app/
│   │   ├── dashboard/          # Protected dashboard pages
│   │   └── login/              # Login page
│   ├── components/             # UI components (shadcn/ui)
│   ├── lib/
│   │   ├── api/                # API client
│   │   └── store/              # Zustand state
│   ├── Dockerfile
│   └── package.json
│
└── tax-id-verification-api/    # Tax ID validation microservice
    ├── src/
    ├── Dockerfile
    └── package.json
```

## Key Features

### Risk Assessment Engine

The system automatically calculates a risk score (0-100) based on:

- **Country Risk (40 pts)**: High-risk jurisdictions (Panama, Cayman Islands, Switzerland, etc.)
- **Industry Risk (30 pts)**: High-risk industries (construction, security, casino, gambling, crypto)
- **Document Risk (20 pts)**: Missing required documents

**Status Logic:**
- Risk score > 70 → `IN_REVIEW`
- Risk score ≤ 70 → `PENDING`

### Document Management

- Upload PDFs (max 10MB)
- Required documents: Tax Certificate, Registration, Insurance Policy
- Unlimited "OTHER" documents
- Soft delete (preserves audit trail)

### Authentication

- JWT with refresh tokens (stateless)
- Access token: 15 minutes
- Refresh token: 7 days
- Token invalidation on logout (via token version)

## Environment Variables

### Backend (onboarding-api)

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://... |
| JWT_SECRET | Access token secret | - |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| REDIS_URL | Redis connection URL | redis://... |
| AWS_REGION | AWS region | us-east-1 |
| AWS_S3_BUCKET_NAME | S3 bucket name | onboarding-documents |
| AWS_ENDPOINT_URL | S3 endpoint (LocalStack) | http://localstack:4566 |
| TAX_ID_API_URL | Tax validation service | http://tax-id-api:4001 |
| LOG_LEVEL | Logging level (debug, info, warn, error) | info |

### Frontend (onboarding-frontend)

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:3000 |

## Development

### Running Services Locally (without Docker)

```bash
# Backend
cd onboarding-api
npm install
cp .env.example .env  # Configure Variables propperly
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend
cd onboarding-frontend
npm install
npm run dev
```

### Database Commands

```bash
# Apply migrations
cd onboarding-api
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database
npx prisma db seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f onboarding-api
docker compose logs -f postgres
```

### Structured Logging

The backend uses Winston for structured JSON logging:

- **Production**: JSON format to console and files
- **Development**: Pretty-printed colored output
- **Log files**: `logs/error.log`, `logs/combined.log`, `logs/exceptions.log`

Set `LOG_LEVEL=debug` for verbose logging.

## Design Decisions

See [`QUESTIONS.md`](./QUESTIONS.md) for the reasoning behind key architectural and implementation choices made during development.

---

## API Documentation

Once the API is running, visit http://localhost:3000/api/docs for the interactive Swagger documentation.

### Postman Collection

A complete Postman collection is available in `postman/collection.json`.

**Features:**
- Pre-configured requests for all endpoints
- Auto-save tokens after login
- Auto-refresh tokens
- Environment variables for business/document IDs

**Import:**
1. Open Postman → Import → File
2. Select `postman/collection.json`
3. Set `baseUrl` to `http://localhost:3000`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| POST | /businesses | Create business |
| GET | /businesses | List businesses |
| GET | /businesses/:id | Get business details |
| PATCH | /businesses/:id | Update business (admin) |
| PATCH | /businesses/:id/status | Change status (admin) |
| POST | /businesses/:id/documents/upload | Upload document |

## Infrastructure

The project includes a Terraform configuration for deploying to AWS. The infrastructure is defined in the `infrastructure/` directory and includes:

- **VPC**: Networking with public and private subnets across multiple AZs.
- **RDS**: Managed PostgreSQL 15 database in private subnets.
- **S3**: Bucket for document storage with versioning and server-side encryption.
- **ECS**: Fargate cluster for running the API and Frontend containers.
- **ALB**: Application Load Balancer for routing traffic to the ECS services.
- **IAM**: Roles and policies for task execution and S3 access.

To deploy:

1.  Install Terraform.
2.  Navigate to `infrastructure/`.
3.  Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in the values.
4.  Run `terraform init`, `terraform plan`, and `terraform apply`.

## Troubleshooting

### Container fails to start

```bash
# Check logs
docker compose logs onboarding-api

# Rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Database connection issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres pg_isready -U complif -d onboarding_db
```

### Reset everything

```bash
./run.sh
```

Or manually:

```bash
docker compose down -v        # Remove volumes
docker system prune -af        # Clean up
docker compose build --no-cache
docker compose up -d
```

### Tests fail after logger changes

If tests fail after modifying the logger, make sure the logger is compatible with NestJS testing. The logger should have:
- `log()`, `error()`, `warn()`, `debug()`, `verbose()` methods

### Prisma migration issues

If you get `Error: P3009` about failed migrations:

```bash
# Check migration status
docker compose exec postgres psql -U complif -d onboarding_db -c "SELECT * FROM _prisma_migrations;"

# Mark failed migration as rolled back
docker compose run --rm onboarding-api npx prisma migrate resolve --rolled-back <migration_name>

# Or delete the failed migration record
docker compose exec postgres psql -U complif -d onboarding_db -c "DELETE FROM _prisma_migrations WHERE migration_name = '<name>';"
```
