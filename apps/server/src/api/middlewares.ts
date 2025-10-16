import {
  defineMiddlewares,
  authenticate,
} from "@medusajs/framework/http"

/**
 * Global middleware configuration for API routes.
 *
 * This file defines authentication requirements for custom admin API routes.
 * Routes starting with /admin are automatically protected by Medusa's built-in
 * authentication, but we explicitly configure them here for clarity and to
 * ensure proper authentication methods are applied.
 */
export default defineMiddlewares({
  routes: [
    // Protect render engine admin API routes
    {
      matcher: "/admin/render-jobs*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"])
      ],
    },
    // Protect product render history endpoint
    {
      matcher: "/admin/products/*/render-jobs*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"])
      ],
    },
  ],
})
