# Category Selector by Product

This module powers the category navigation hero/widget used across the storefronts. It exposes Medusa admin endpoints for configuring how each top-level category is represented and a store endpoint that the frontends consume.

The feature is backed by a lightweight config table keyed by category ID plus a reserved global row (`__category_selector_by_product_global__`) that controls presentation defaults.

> Authentication: Admin routes require an authenticated Medusa admin session. Store routes are public.

## Admin Endpoints

### Global presentation settings

- **GET** `/admin/category-selector-by-product/settings`
- **PUT** `/admin/category-selector-by-product/settings`

Payload schema:

```json
{
  "presentation": {
    "enabled": true,
    "scale_mode": "cover",        // fit_width | fit_height | cover | shortest_side | longest_side
    "style": "grid",              // grid | carousel | edge_to_edge | square | flips
    "max_rows": null,              // positive integer or null for auto
    "max_columns": null,
    "randomize_visible_categories": false
  }
}
```

PUT requests accept the same shape but all fields are optional; unspecified values fall back to defaults. Successful responses echo the normalized configuration.

### Category configuration list

- **GET** `/admin/category-selector-by-product`

Returns all top-level categories (no parent) with their selector config, resolved product information, and the current global presentation preset:

```json
{
  "categories": [
    {
      "id": "cat_123",
      "name": "Shoes",
      "handle": "shoes",
      "description": "Footwear for every occasion",
      "parent_category_id": null,
      "config": {
        "id": "cfg_123",
        "category_id": "cat_123",
        "mode": "product_image",   // custom_image | product_image | random_product
        "custom_image_url": null,
        "selected_product_id": "prod_987",
        "selected_product_image_id": "img_abc",
        "random_product_ids": ["prod_111", "prod_222"],
        "presentation": { ... global settings ... },
        "metadata": { ... },
        "created_at": "2025-09-20T12:02:11.000Z",
        "updated_at": "2025-09-22T19:45:12.000Z"
      },
      "resolved_product": { /* hydrated product for visualization */ },
      "resolved_image": { /* chosen product image */ },
      "resolved_pool": [ /* products included in random rotation */ ]
    }
  ],
  "availableModes": ["custom_image", "product_image", "random_product"],
  "total": 6,
  "presentation": { ... global settings ... }
}
```

### Category detail & upsert

- **GET** `/admin/category-selector-by-product/:category_id`
- **PUT** `/admin/category-selector-by-product/:category_id`
- **DELETE** `/admin/category-selector-by-product/:category_id`

`GET` returns the persisted config with resolved product/image info. `PUT` accepts the following payload (only include fields relevant to the chosen mode):

```json
{
  "mode": "random_product",
  "random_product_ids": ["prod_111", "prod_222", "prod_333"],
  "custom_image_url": null,
  "selected_product_id": null,
  "selected_product_image_id": null,
  "metadata": {},
  "presentation": {
    "enabled": true,
    "scale_mode": "cover",
    "style": "grid",
    "max_rows": null,
    "max_columns": null,
    "randomize_visible_categories": false
  }
}
```

The service validates `mode` and ensures required product/image selections are present when `mode === "product_image"`. `DELETE` removes the category-specific config (categories then inherit the global presentation preset).

## Storefront Endpoint

- **GET** `/store/category-selector-by-product`

This is the route your Next.js storefront should call. It returns the hydrated category data along with the shared presentation settings:

```json
{
  "generated_at": "2025-09-22T19:47:10.236Z",
  "presentation": {
    "enabled": true,
    "scale_mode": "cover",
    "style": "grid",
    "max_rows": null,
    "max_columns": null,
    "randomize_visible_categories": false
  },
  "categories": [
    {
      "id": "cat_123",
      "name": "Shoes",
      "handle": "shoes",
      "description": "Footwear for every occasion",
      "mode": "product_image",
      "config_id": "cfg_123",
      "updated_at": "2025-09-22T19:45:12.000Z",
      "custom_image_url": null,
      "representation": {
        "type": "product_image",
        "product": {
          "id": "prod_987",
          "title": "Daily Runner",
          "handle": "daily-runner",
          "description": "Lightweight running shoe",
          "thumbnail": "https://cdn.example.com/run.jpg",
          "images": [
            { "id": "img_abc", "url": "https://...", "alt_text": "Side profile" }
          ]
        },
        "image": { "id": "img_abc", "url": "https://...", "alt_text": "Side profile" }
      },
      "has_configuration": true,
      "issues": [],
      "presentation": {
        "enabled": true,
        "scale_mode": "cover",
        "style": "grid",
        "max_rows": null,
        "max_columns": null,
        "randomize_visible_categories": false
      }
    }
  ]
}
```

### Frontend implementation tips
- Use the top-level `presentation` object as the authoritative layout preset for the widget. If you need per-category overrides, read each entry’s `presentation` (it mirrors the global settings unless the backend diverges in the future).
- Respect `presentation.enabled`; if `false`, the widget should hide or collapse
- `randomize_visible_categories` can drive client-side shuffling before rendering
- `max_rows` / `max_columns` are optional clamps for responsive grids or carousels
- Determine display “mode” by branching on `category.mode`:
  - `custom_image` → show `custom_image_url` (may be `null`, use a fallback)
  - `product_image` → use `representation.product` + `representation.image`
  - `random_product` → iterate `representation.pool`
- `issues` contains human-readable warnings (missing products/images); handle gracefully in the UI by falling back to placeholders or skipping entries.

## Data flow summary
1. Admins manage per-category modes and the global layout preset via the admin routes.
2. The global preset is stored once and propagated to each category config on update.
3. Storefront clients consume `/store/category-selector-by-product`, combining the preset with category-specific data to render the widget.

This README should provide enough context to wire the Next.js storefront without needing the admin UI.
