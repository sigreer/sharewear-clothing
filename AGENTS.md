# Repository Guidelines

## Overview
Medusa v2 ecommerce monorepo with Bun workspaces. Apps:
- Server (`apps/server`): TypeScript Medusa backend on port 9000. Admin GUI: http://localhost:9000/app
- Storefront (`apps/storefront1`): Next.js 15, primary UI on port 8201: http://localhost:8201
- Database: PostgreSQL at postgres:postgres@localhost:55432/shareweardb
Follow v2 patterns in `CLAUDE.md` (modules, API routes, workflows, admin widgets).

## Admin Access
- URL: http://localhost:9000/app or http://sharewear.local:9000/app
- Email: admin@medusa-test.com
- Password: supersecret

## Key Project Paths
Root directory: `/localdev/sigreer/sharewear.clothing`

### Server (`apps/server/`)
- Configuration: `medusa-config.ts`, `.env.local`
- API Routes: `src/api/` (file-based routing, use `route.ts`)
- Custom Modules: `src/modules/` (business logic, models, services)
  - Dynamic Category Menu: `src/modules/dynamic-category-menu/`
  - Mega Menu: `src/modules/mega-menu/`
  - Category Selector: `src/modules/category-selector-by-product/`
  - Mailtrap: `src/modules/mailtrap-plugin/`, `src/modules/mailtrap-notification/`
- Admin Extensions: `src/admin/` (React components, widgets)
  - Routes: `src/admin/routes/`
  - Widgets: `src/admin/widgets/`
- Workflows: `src/workflows/`
- Jobs: `src/jobs/`
- Subscribers: `src/subscribers/`
- Scripts: `src/scripts/` (seed data, utilities)
- Tests: `integration-tests/http/`, `src/**/__tests__/`
- Static Files: `static/` (uploaded media)

### Storefront (`apps/storefront1/`)
- Configuration: `next.config.js`, `.env.local`
- App Directory: `src/app/` (Next.js 15 App Router)
- Components: `src/components/`
- Lib/Utils: `src/lib/`
- Public Assets: `public/`
- Styles: `src/styles/` or `src/app/globals.css`

### Documentation
- `CLAUDE.md` - Main development guidelines for Claude
- `AGENTS.md` - This file, repository structure guide
- `GIT_WORKFLOW.md` - Git workflow and commit conventions
- `MEDUSA_DOCS.md` - Medusa v2 documentation (if exists)

## Project Structure & Module Organization
- Monorepo managed with Bun workspaces: `apps/*`.
- Backend: `apps/server` (Medusa v2, port 9000). Key folders: `src/api`, `src/modules`, `src/admin`, `src/workflows`, `src/scripts`, and `integration-tests`.
- Frontend: `apps/storefront1` (port 8201). Public assets in `public/`.

## Build, Test, and Development Commands
- Root workflows (uses Bun):
  - `bun run dev` — Run server + primary storefront together.
  - `bun run build` / `bun run start` — Build/start all primary apps.
  - `bun run db:migrate` / `bun run db:seed` / `bun run setup` — DB ops for server.
- App-specific:
  - Server: `cd apps/server && bun run dev|build|start|test:unit|test:integration:http`.
  - Storefront: `cd apps/storefront1 && bun run dev|build|start|lint`.

## Coding Style & Naming Conventions
- Languages: TypeScript/JavaScript. Indent 2 spaces; avoid trailing whitespace.
- Naming: `camelCase` (vars/functions), `PascalCase` (components/classes), `kebab-case` (branches), Next.js routes mirror folder names.
- Lint/format: ESLint and Prettier are configured in storefront; run `bun run lint` before PRs.
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

## MCP Server Usage (Model Context Protocol)
This project has several MCP servers configured. **ALWAYS prefer using MCP tools over raw web searches** for the following:

### Available MCP Servers
1. **ShadCN UI Components** (`mcp__shadcn__*`)
   - Use for: UI component queries, ShadCN component implementations, examples
   - Tools: `search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`, `get_add_command_for_items`
   - Example: Instead of web searching "shadcn button component", use `mcp__shadcn__search_items_in_registries`

2. **StackZero UI Components** (`mcp__stackzero-labs-mcp__*`)
   - Use for: Ecommerce-specific UI blocks (product cards, carts, reviews, banners)
   - Tools: `getUIComponents`, `getUIBlocks`, `getProductCards`, `getRatings`, `getImages`, `getProducts`, `getCarts`, `getReviews`, `getBanners`, etc.
   - Example: For product card layouts, use `mcp__stackzero-labs-mcp__getProductCards`

3. **Playwright Browser Automation** (`mcp__playwright__*`)
   - Use for: Browser testing, UI interaction testing, screenshots, form filling
   - Tools: `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_take_screenshot`, `browser_fill_form`, etc.
   - Example: For testing admin uploads, use `mcp__playwright__browser_navigate` then `mcp__playwright__browser_snapshot`

4. **MedusaJS Documentation** (via WebFetch)
   - Use for: Medusa v2 API references, module patterns, workflows
   - Always check: https://docs.medusajs.com for Medusa-specific queries
   - Example: Use `WebFetch` with docs.medusajs.com URLs instead of generic web search

### MCP Usage Guidelines
- **FIRST** check if an MCP tool exists for your task
- **THEN** fall back to WebSearch only if no MCP tool is available
- MCP tools provide more accurate, project-scoped information than web searches
- All MCP servers are project-scoped and optimized for this codebase

## Bash Command Best Practices
**IMPORTANT**: Follow these guidelines to avoid command execution issues:

### Working Directory
- Root directory: `/localdev/sigreer/sharewear.clothing`
- Always use absolute paths or `cd` to the correct directory
- Test: `pwd` to verify current directory before complex operations

### Command Syntax Issues
- **AVOID**: Using backticks `` ` `` in complex commands with pipes - they cause parsing errors
- **AVOID**: Using `eval` syntax - it doesn't work properly with the Bash tool
- **PREFER**: Direct command execution: `cd apps/server && bun run dev`
- **PREFER**: Command chaining with `&&` for dependent commands
- **PREFER**: Using `;` only when commands should run regardless of previous failures

### Common Pitfalls
```bash
# ❌ BAD - eval syntax fails
(eval):cd:1: no such file or directory: apps/server

# ✅ GOOD - direct cd with command chaining
cd apps/server && pwd && ls -la

# ❌ BAD - complex backtick substitution in pipes
cat `find . -name "*.ts"` | grep pattern

# ✅ GOOD - use tools appropriately
# Use Glob tool for finding files, Read tool for reading, Grep tool for searching
```

### File Operations
- **Use dedicated tools** instead of bash commands:
  - `Read` tool (not `cat`, `head`, `tail`)
  - `Edit` tool (not `sed`, `awk`)
  - `Write` tool (not `echo >`, `cat <<EOF`)
  - `Glob` tool (not `find`, `ls` for file discovery)
  - `Grep` tool (not `grep`, `rg` bash commands)
- Reserve bash for actual system operations: git, npm/bun, docker, process management

## Security & Configuration Tips
- Use per-app `.env` files; never commit secrets. Keep DB creds and Medusa keys local.
- Reset local state if needed: `bun run clean` then `bun run reset`.
- File provider uses `sharewear.local:9000` - configure `/etc/hosts` as needed (see CLAUDE.md)
