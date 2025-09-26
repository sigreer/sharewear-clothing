# Mailtrap Plugin Module

This module wraps the Mailtrap integration logic that is shared across the Medusa application. It exposes a `MailtrapPluginService` that:

- Normalizes and validates Mailtrap configuration (token, account/test inbox identifiers, sender defaults, and optional `MAILTRAP_DEFAULT_RECIPIENTS`).
- Synchronizes template metadata by calling Mailtrap's Templates API and persisting template mappings in the `mailtrap_template_mapping` table.
- Provides helper methods used by API routes and other services, such as `listMailtrapTemplates`, `getMailtrapTemplateDetail`, `getDefaultRecipients`, and `sendTestEmail`.
- Wraps the Mailtrap API client so we can mock it in tests and centralize error handling.
- Bootstraps the `MailtrapNotificationDispatcher` loader which subscribes to Medusa workflow events (for example `product-tag.created`) and forwards them to the notification module using the configured template mappings.

## Relationship to `mailtrap-notification`

The [`mailtrap-notification`](../mailtrap-notification/README.md) module registers the actual notification provider that Medusa's notification module uses to send e-mails. It depends on `MailtrapPluginService` for template lookups, default sender information, and (now) default recipients. The plugin module is intentionally kept separate so we can reuse the same service from API routes, admin UI, workflow hooks, and future plugin packaging.

Keeping the modules separate mirrors how Medusa plugins are structured: the plugin module exposes the reusable service + migrations, while the notification module only implements the provider contract. Consolidating them would couple provider registration with the persistence layer and make it harder to package the provider inside a future `create-medusa-app --plugin` scaffold.

## Loader & Dispatcher

The loader at `loaders/register-mailtrap-dispatcher.ts` instantiates the `MailtrapNotificationDispatcher`. The dispatcher:

1. Loads all enabled template mappings on startup.
2. Subscribes to the event bus for each mapped handle.
3. Resolves recipients (payload -> default recipients -> sender fallback).
4. Calls `notificationModuleService.createNotifications` so the configured provider sends the message.

Whenever mappings change the admin API informs the dispatcher so it can subscribe to new handles.

## Admin API helpers

Additional admin endpoints live under `src/api/admin/mailtrap`:

- `GET /admin/mailtrap/templates` – returns template summaries and default configuration.
- `GET /admin/mailtrap/templates/:id/preview` – fetches HTML preview of a template (uses numeric template id under the hood).
- `POST /admin/mailtrap/templates/:id/test` – sends a test e-mail to provided or default recipients.
- `POST /admin/mailtrap/mappings` and `DELETE /admin/mailtrap/mappings/:id` – manage template mappings and keep dispatcher subscriptions in sync.

Those routes back the admin page in `src/admin/routes/settings/mailtrap/page.tsx`, which now shows previews and offers a "Send test email" workflow.

## Configuration recap

Set the following environment variables (or provide module options) to unlock the full feature set:

- `MAILTRAP_API_TOKEN` – required API token.
- `MAILTRAP_ACCOUNT_ID` – required for template listing/previews.
- `MAILTRAP_SENDER_EMAIL` / `MAILTRAP_SENDER_NAME` – default sender data used in notifications.
- `MAILTRAP_DEFAULT_RECIPIENTS` – optional comma-separated list of fallback recipients when events do not provide explicit addresses.
- `MAILTRAP_USE_SANDBOX` + `MAILTRAP_TEST_INBOX_ID` – optional sandbox mode support.

## Future plugin packaging

When we eventually extract a dedicated Mailtrap plugin repository we can lift this module (service, dispatcher, migrations, admin/assets) as the core plugin payload, while keeping the notification provider and admin page intact. This README, together with the new plugin development guide, codifies the separation of responsibilities so we can keep the modules lightweight and aligned with Medusa v2 practices.
