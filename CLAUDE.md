# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a **Medusa v2** ecommerce application with a monorepo structure containing:
- **Server** (`apps/server/`): Medusa backend with TypeScript
- **Storefront** (`apps/storefront1/`): Next.js frontend with TypeScript

**IMPORTANT**: This project uses Medusa v2. Always refer to the Medusa v2 documentation located at `MEDUSA_DOCS.md` for accurate implementation patterns, API references, and best practices. Do NOT implement Medusa v1 features or patterns.

### Server Architecture (`apps/server/`)
- **API Routes** (`src/api/`): File-based routing with `route.ts` files for REST endpoints
- **Modules** (`src/modules/`): Custom business logic modules with models and services
- **Admin Extensions** (`src/admin/`): React components for admin dashboard customizations
- **Workflows** (`src/workflows/`): Business process orchestration
- **Jobs** (`src/jobs/`): Background task processing
- **Subscribers** (`src/subscribers/`): Event-driven functionality

### Storefront Architecture (`apps/storefront1/`)
- Next.js 15 with React 19 RC
- Tailwind CSS for styling
- Medusa JS SDK integration
- Server-side rendering enabled

## Development Commands

**IMPORTANT**: Before starting development servers, check for existing instances running on the required ports:
- Backend server runs on port 9000
- Admin web GUI: **http://localhost:9000/app** (use localhost, NOT sharewear.local for dev)
  - **Note**: Due to Vite dev server limitations, admin UI must be accessed via `localhost` in development
  - API endpoints and file URLs can use `sharewear.local:9000`
  - Production builds work with any hostname
- Storefront runs on port 8201: http://localhost:8201 (or http://sharewear.local:8201)
- Database: postgres:postgres@localhost:55432/shareweardb
- Use `lsof -i :PORT` to check if ports are in use

**File Provider Configuration**: The file provider uses `sharewear.local:9000` for uploaded media URLs. To access media from any environment:
- Add to `/etc/hosts`: `127.0.0.1 sharewear.local` (for local access)
- Or add your remote IP: `<your-tailscale-ip> sharewear.local` (for remote access)
- This allows consistent media URLs across different access methods (localhost, Tailscale, etc.)

### Server (`apps/server/`)
```bash
cd apps/server
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run seed         # Seed database with sample data

# Database operations
bunx medusa db:generate <module>  # Generate migrations
bunx medusa db:migrate           # Run migrations

# Testing
bun run test:unit                  # Run unit tests
bun run test:integration:http      # Run HTTP integration tests
bun run test:integration:modules   # Run module integration tests
```

### Storefront (`apps/storefront1/`)
```bash
cd apps/storefront1
bun run dev     # Start development server (port 8201)
bun run build   # Build for production
bun run start   # Start production server (port 8201)
bun run lint    # Run ESLint
```

## Key Configuration Files

- **medusa-config.ts**: Medusa server configuration (database, CORS, JWT)
- **jest.config.js**: Backend test configuration with environment-specific test matching
- **package.json**: Dependencies and npm scripts for each app
- **MEDUSA_DOCS.md**: Complete Medusa v2 documentation reference

## Documentation Resources

Always consult `MEDUSA_DOCS.md` when working with Medusa features. Key sections include:
- **Framework**: Architecture, modules, API routes, workflows, events
- **Commerce Modules**: Product, Cart, Order, Payment, Fulfillment, etc.
- **Storefront Development**: Product display, cart management, checkout, customer accounts
- **API Reference**: Admin and Store API endpoints with examples

## Development Patterns - Medusa Server

### Creating API Routes
- Place in `src/api/` with file-based routing
- Use `route.ts` with exported HTTP method functions (GET, POST, etc.)
- Access container services via `req.scope.resolve()`
- Use `[param]` folders for dynamic routes

### Creating Custom Modules
1. Create models in `models/` directory
2. Create service extending `MedusaService`
3. Export module definition in `index.ts`
4. Add to `medusa-config.ts` modules array
5. Generate and run migrations

### Admin Customizations
- Create React components in `src/admin/`
- Use `defineWidgetConfig` for widget placement
- Widgets can be injected into existing admin pages

## Development Patterns - Storefront

Refer to [AGENTS.md](apps/storefront1/AGENTS.md) for the recommended Storefront-specific workflow.

## Testing Strategy
- **Unit tests**: `src/**/__tests__/**/*.unit.spec.[jt]s`
- **HTTP integration tests**: `integration-tests/http/*.spec.[jt]s`
- **Module integration tests**: `src/modules/*/__tests__/**/*.[jt]s`
- Uses Jest with SWC for transformation
- Environment-specific test execution via `TEST_TYPE` environment variable

## Git Workflow

Refer to `GIT_WORKFLOW.md` for the recommended Git workflow.

## Medusa-Specific Workflow

Refer to `MEDUSA_DOCS.md` for the recommended Medusa-specific workflow.

## Security & Configuration Tips
- Use per-app `.env` files; never commit secrets. Keep DB creds and Medusa keys local.