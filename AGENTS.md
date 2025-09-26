# Repository Guidelines

## Overview
Medusa v2 ecommerce monorepo with Bun workspaces. Apps:
- Server (`apps/server`): TypeScript Medusa backend. Follow v2 patterns in `MEDUSA_DOCS.md` (modules, API routes, workflows).
- Storefront (`apps/storefront`): Next.js 15, primary UI (port 8000).
- Storefront2 (`apps/storefront2`): Alternative Next.js UI using Radix/shadcn patterns (port 8201).
- Munch (`apps/munch`): Experimental Next.js app (port 8301).
Typical server port is 9000. Use root scripts to run server + storefront together.

## Project Structure & Module Organization
- Monorepo managed with Bun workspaces: `apps/*`.
- Backend: `apps/server` (Medusa v2). Key folders: `src/api`, `src/modules`, `src/workflows`, `src/scripts`, and `integration-tests`.
- Frontends: `apps/storefront` (8000) and `apps/storefront2` (8201). Public assets in each app’s `public/`.
- Experimental app: `apps/munch` (8301).

## Build, Test, and Development Commands
- Root workflows (uses Bun):
  - `bun run dev` — Run server + primary storefront together.
  - `bun run build` / `bun run start` — Build/start all primary apps.
  - `bun run db:migrate` / `bun run db:seed` / `bun run setup` — DB ops for server.
- App-specific:
  - Server: `cd apps/server && bun run dev|build|start|test:unit|test:integration:http`.
  - Storefronts: `cd apps/storefront && bun run dev|build|start` (same for `storefront2`).
  - Munch: `cd apps/munch && bun run dev|build|start`.

## Coding Style & Naming Conventions
- Languages: TypeScript/JavaScript. Indent 2 spaces; avoid trailing whitespace.
- Naming: `camelCase` (vars/functions), `PascalCase` (components/classes), `kebab-case` (branches), Next.js routes mirror folder names.
- Lint/format: ESLint and Prettier are configured in frontend apps; run `bun run lint` (storefronts) and `bun run format` (munch) before PRs.
- Server layout: new modules in `apps/server/src/modules/<feature>`; HTTP routes in `src/api/<scope>/<route>.ts`.

## Testing Guidelines
- Framework: Jest on the server with Medusa test utils.
- Locations: integration HTTP specs in `apps/server/integration-tests/http/*.spec.ts`.
- Commands: root `bun run test` (server unit), or in `apps/server` use `bun run test:unit`, `bun run test:integration:http`, `bun run test:integration:modules`.
- Conventions: name tests `*.spec.ts`; prefer small, focused cases; add regression tests for fixes.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat: …`, `fix: …`, `chore: …`, `docs: …` (see `GIT_WORKFLOW.md`).
- Branches: `feature/<short-topic>`, `fix/<short-topic>`, `upgrade/medusa-<ver>`.
- PRs must include: clear description, linked issues, test plan, and screenshots/GIFs for UI changes.
- CI hygiene: run `bun run lint` (frontends) and `bun run test` (server) locally before opening PRs.

## Security & Configuration Tips
- Use per-app `.env` files; never commit secrets. Keep DB creds and Medusa keys local.
- Reset local state if needed: `bun run clean` then `bun run reset`.
