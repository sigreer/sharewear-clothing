# Building Medusa v2 Plugins: Quick Reference

This guide distills what we learned while wiring the Mailtrap integration inside this repository. Use it as a checklist whenever you bootstrap a new plugin project with `create-medusa-app <name> --plugin`.

## 1. Start from a Plugin Skeleton

1. Run `bunx create-medusa-app my-plugin --plugin` to get the v2-ready folder structure (`src/modules`, `src/admin`, `src/api`, `src/workflows`, …).
2. Keep the plugin repo focused on reusable pieces. Application-specific wiring (custom API routes, feature toggles) lives in the Medusa project that consumes the plugin.
3. Make sure `package.json` exposes the expected entry points (`./.medusa/server/src/modules/*`, `./providers/*`, `./admin`, etc.) and sets peer/dev dependencies to the target Medusa version.

## 2. Module Layout & Naming

- Implement domain logic in `src/modules/<feature>` using `Module(<token>, { service, loaders, migrations })`.
- Register providers separately with `ModuleProvider(Modules.NOTIFICATION, { services: [...] })`, mirroring how Mailtrap splits the reusable service and the notification provider.
- Add migrations under the module (for example `migrations/`) and export them from the plugin so consumers can run them automatically.
- Prefer small, purpose-driven modules; avoid monolithic “everything” modules because they are harder to reason about and to reuse.

## 3. Keep Things Framework-Native

- Stick to Medusa v2 primitives (`Module`, `ModuleProvider`, workflows, event bus subscribers). Avoid legacy v1 concepts (extends `BaseService`, `Subscriber`, or direct `EventBusService` imports from v1 packages).
- Use dependency injection: resolve other modules with `container.resolve(Modules.X)` instead of importing singletons.
- Register loaders when you need to wire runtime behavior (e.g., subscribe to events) — see `mailtrap-plugin/loaders/register-mailtrap-dispatcher.ts` for an example.

## 4. API + Admin Bundle

- Keep API routes inside the plugin when they are reusable (e.g., `/admin/mailtrap/templates`). Use the same handler signatures (`export async function GET(req, res)`) as you would inside a Medusa project.
- Frontend customizations live in `src/admin`. Build pure components or routes that fetch through your plugin's API endpoints. The Mailtrap admin page demonstrates how to extend the admin without touching the host app.

## 5. Configuration & DX

- Normalize plugin options in the module service (parse env vars, coerce booleans/numbers, log missing configuration).
- Document required env vars (`MAILTRAP_API_TOKEN`, etc.) inside the plugin README.
- Provide helper methods (`getDefaultRecipients`, `sendTestEmail`) so consuming apps can build admin tooling quickly.

## 6. Testing Strategy

- Use `medusaIntegrationTestRunner` for end-to-end coverage of your routes and workflows. Mock third-party SDK clients by spying on the service factory (`MailtrapPluginService.buildMailtrapClient` in our case).
- Add unit/regression tests for tricky logic (event dispatchers, providers). Each bug fix should come with a regression test.

## 7. Packaging Tips

- Avoid importing compiled `dist` paths from other packages. Either import from the package root (preferred) or expose the types you need from your plugin to consumers.
- Keep exports stable (`index.ts` re-exports) so the host can resolve your services with `container.resolve`.
- Provide a changelog and clear migration notes when you change database models or configuration shapes.

Following these steps keeps new plugins aligned with Medusa v2 expectations and reduces the time you spend rewriting v1-era patterns. Feel free to evolve this guide as we extract more integrations.
