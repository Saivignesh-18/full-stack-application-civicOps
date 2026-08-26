# CivicOps - Multi-Tenant Municipal Operations Platform

A production-oriented full-stack application for municipal operations and civic management.

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Redis (caching, rate limiting, queues)
- BullMQ (background jobs)
- Socket.IO (real-time)
- JWT authentication

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- React Router
- Axios
- Recharts (dashboards)

### Infrastructure
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7
- Nginx (production)

## Project Structure

```
civicops/
├── backend/           # Express API server
├── frontend/          # React SPA
├── worker/            # Background job processor
├── chatbot/           # AI chatbot service (Python)
├── prisma/            # Database schema & migrations
├── postman/           # API testing collection
├── docs/              # Documentation
├── compose.yaml       # Docker Compose config
└── .env.example       # Environment variables template
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- pnpm, npm, or yarn

### 1. Clone & Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env and configure:
# - JWT secrets (generate secure random strings)
# - Database credentials
# - Other settings as needed
```

### 2. Start Infrastructure (Database & Redis)

```bash
# Start PostgreSQL and Redis only (for local development)
docker compose -f compose.yaml -f compose.dev.yaml up -d
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed demo data
npm run prisma:seed

# Start development server
npm run dev
```

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Setup Worker (Optional)

```bash
cd worker

# Install dependencies
npm install

# Start worker
npm run dev
```

## Environment Variables

See `.env.example` for the complete list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) |
| `CORS_ORIGIN` | Allowed frontend origins |

## API Endpoints

### Authentication
```
POST /api/v1/auth/register    # Register new user
POST /api/v1/auth/login       # Login
POST /api/v1/auth/refresh     # Refresh tokens
POST /api/v1/auth/logout      # Logout
GET  /api/v1/auth/me          # Current user
```

### Complaints
```
POST   /api/v1/complaints           # Create complaint
GET    /api/v1/complaints           # List complaints
GET    /api/v1/complaints/:id       # Get complaint
PUT    /api/v1/complaints/:id       # Update complaint
PATCH  /api/v1/complaints/:id/status # Update status
PATCH  /api/v1/complaints/:id/assign # Assign complaint
DELETE /api/v1/complaints/:id       # Delete complaint
```

### Other Modules
- `/api/v1/employees` - Employee management
- `/api/v1/citizens` - Citizen management
- `/api/v1/properties` - Property tax
- `/api/v1/licenses` - Trade licenses
- `/api/v1/projects` - Engineering works
- `/api/v1/documents` - File uploads
- `/api/v1/webhooks` - Webhook subscriptions
- `/api/v1/dashboard` - Dashboard statistics

## Demo Credentials

After running seed:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@civicops.com | Admin@123 |
| Municipal Admin | admin@demo-mc.gov | Admin@123 |
| Field Officer | officer@demo-mc.gov | Admin@123 |
| Citizen | citizen@example.com | Admin@123 |

## Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop all services
docker compose down

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d
```

## Development

### Database Commands

```bash
# View database in Prisma Studio
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (caution!)
npx prisma migrate reset
```

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│    (React SPA, Mobile Apps, External Systems)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                          │
│              (Static assets, SSL, DDoS protection)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Server                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Middleware: Auth, RBAC, Tenant, Rate Limit, Logging │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Controllers → Services → Repositories               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │PostgreSQL│    │  Redis   │    │  Worker  │
     │   (DB)   │    │ (Cache)  │    │ (Queue)  │
     └──────────┘    └──────────┘    └──────────┘
```

## Multi-Tenancy

Every tenant-scoped request follows this flow:

```
Request → JWT Auth → User Identity → Tenant Context → RBAC → Controller
```

- Tenant isolation enforced at service/repository level
- All queries filtered by tenant_id
- Cross-tenant access prevented

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit PR

## License

Proprietary - All rights reserved
