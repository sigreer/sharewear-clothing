# Mega Menu Extension

A comprehensive mega-menu system for Medusa v2 that provides rich, customizable navigation menus with support for multi-column layouts, featured cards, badges, and category-specific configurations.

## Architecture Overview

The mega-menu system consists of three main layers:

1. **Backend Module** (`apps/server/src/modules/mega-menu/`)
2. **Admin UI** (`apps/server/src/admin/`)
3. **Storefront Components** (`apps/storefront1/src/modules/layout/components/mega-menu/`)

## Backend Implementation

### Location: `apps/server/src/modules/mega-menu/`

#### Core Files

- **[index.ts](../../apps/server/src/modules/mega-menu/index.ts)** - Module definition and exports
- **[service.ts](../../apps/server/src/modules/mega-menu/service.ts)** - Business logic service
- **[models/mega-menu-config.ts](../../apps/server/src/modules/mega-menu/models/mega-menu-config.ts)** - Database model
- **[types.ts](../../apps/server/src/modules/mega-menu/types.ts)** - TypeScript type definitions
- **[migrations/](../../apps/server/src/modules/mega-menu/migrations/)** - Database migrations

#### Database Schema

The `mega_menu_config` table stores configuration for both global and per-category mega menus:

```typescript
{
  id: string (primary key)
  category_id: string (unique) // Use "__mega_menu_global__" for global config
  layout: "default" | "thumbnail-grid"
  tagline: string | null
  columns: JSON // MegaMenuColumnConfig[]
  featured: JSON // MegaMenuFeaturedCardConfig[]
  submenu_category_ids: JSON // string[]
  metadata: JSON
  // Parent category configuration
  display_mode: "simple-dropdown" | "columns" | null
  // Subcategory column configuration
  column_layout: "image" | "image-with-text" | "subcategory-icons" | "text-and-icons" | null
  column_image_url: string | null
  column_image_source: "upload" | "product" | null
  column_badge: "new" | "offers" | "free-shipping" | "featured" | null
}
```

#### Key Service Methods

**MegaMenuService** ([service.ts:59](../../apps/server/src/modules/mega-menu/service.ts#L59))

- `upsertCategoryConfig(data)` - Create/update category-specific config
- `upsertGlobalConfig(data)` - Create/update global fallback config
- `getCategoryConfig(categoryId)` - Get config for specific category
- `getGlobalConfig()` - Get global config
- `buildNavigationWithMegaMenu(navigation, categories)` - Build navigation tree with mega menu data
- `buildPreview(config, categories)` - Generate preview of mega menu content

#### API Routes

**Admin API** (`apps/server/src/api/admin/mega-menu/`)

- `GET /admin/mega-menu/global` - Fetch global configuration
- `PUT /admin/mega-menu/global` - Update global configuration
- `DELETE /admin/mega-menu/global` - Delete global configuration
- `GET /admin/mega-menu/categories` - List all categories with their configs
- `GET /admin/mega-menu/:category_id` - Fetch category-specific configuration
- `PUT /admin/mega-menu/:category_id` - Update category configuration
- `DELETE /admin/mega-menu/:category_id` - Delete category configuration

**Store API** (`apps/server/src/api/store/`)

- `GET /store/navigation` - Get navigation tree with mega menu content ([route.ts:13](../../apps/server/src/api/store/navigation/route.ts#L13))

## Admin UI Implementation

### Location: `apps/server/src/admin/`

#### Main Admin Page

**[routes/catalog/mega-menu/page.tsx](../../apps/server/src/admin/routes/catalog/mega-menu/page.tsx)**

Central management page for mega-menu configuration accessible at `/admin/catalog/mega-menu`

Features:
- Global configuration editor with layout selection (default/thumbnail-grid)
- Global tagline, columns (JSON), and featured cards (JSON)
- Live preview of global configuration
- Category list with status badges (custom/inherited)
- Category-specific configuration modals

#### Category Widget

**[widgets/category-mega-menu-widget.tsx](../../apps/server/src/admin/widgets/category-mega-menu-widget.tsx)**

Inline widget displayed on category detail pages (`zone: "product_category.details.after"`)

Features:
- **Parent Categories**: Display mode selection (simple-dropdown/columns)
- **Subcategories**: Column layout options, image upload/selection, badge assignment
- Quick access to layout, tagline, and submenu category configuration
- Status indicators (custom layout/inheriting global)
- Reset and remove customization options

#### Widget Registration

**[admin/index.ts](../../apps/server/src/admin/index.ts)** - Registers both the admin page route and category widget

## Storefront Implementation

### Location: `apps/storefront1/src/modules/layout/components/mega-menu/`

#### Main Component

**[index.tsx](../../apps/storefront1/src/modules/layout/components/mega-menu/index.tsx)**

The `MegaMenuPanel` component renders the mega menu with:

- **Two Layout Modes**:
  - `default` - Multi-column grid layout with optional featured cards
  - `thumbnail-grid` - Compact thumbnail-based grid layout

- **Column Rendering**:
  - Badge display (NEW, OFFERS, FREE SHIPPING, FEATURED)
  - Optional column images
  - Heading and description
  - Item links with icons, badges, and thumbnails
  - Support for different column layouts (image, image-with-text, subcategory-icons, text-and-icons)

- **Featured Cards**:
  - Card-based promoted content
  - Eyebrow text, label, description
  - Optional CTA label and background image

- **Animation**:
  - Framer Motion stagger animations
  - Smooth entrance transitions

### Data Integration

**[lib/data/navigation.ts](../../apps/storefront1/src/lib/data/navigation.ts)**

- `listNavigation()` - Fetches navigation tree from `/store/navigation`
- Normalizes and type-checks navigation data
- Returns `NavigationItem[]` with embedded `megaMenu` content

**Usage in Navigation**:

The mega menu is typically used in the main navigation bar (e.g., `scroll-navbar/index.tsx`):

```typescript
const navigation = await listNavigation()

// Each navigation item has:
{
  id: string
  label: string
  href: string
  children: NavigationItem[]
  megaMenu?: MegaMenuContent | null // =H Mega menu data
}
```

## Configuration Flow

### Global Configuration

1. Admin navigates to `/admin/catalog/mega-menu`
2. Edits global settings (layout, tagline, columns, featured)
3. Saves ’ `PUT /admin/mega-menu/global`
4. Service generates preview
5. Global config is used as fallback for all categories without custom config

### Category-Specific Configuration

1. **Via Admin Page**:
   - Select category from list
   - Edit in modal (layout, tagline, submenu categories, columns, featured)
   - Save ’ `PUT /admin/mega-menu/:category_id`

2. **Via Category Widget** (on category detail page):
   - For parent categories: Configure display mode (simple-dropdown/columns)
   - For subcategories: Configure column layout, image, badge
   - Configure layout, tagline, submenu categories
   - Save ’ `PUT /admin/mega-menu/:category_id`

### Inheritance Model

- Categories without custom config inherit from **global config**
- When a category has `submenuCategoryIds` set, those categories are auto-rendered as menu items
- Manual `columns` configuration overrides automatic submenu generation
- Subcategory-specific configurations (column layout, image, badge) are used when rendering in parent's mega menu

### Parent-Subcategory Column Customization

**Parent categories** can set a `display_mode`:
- `simple-dropdown` - Traditional dropdown menu
- `columns` - Rich mega menu with customizable subcategory columns

**Subcategories** (when parent uses `columns` mode) can customize their column appearance:
- `column_layout` - Visual layout (image, image-with-text, subcategory-icons, text-and-icons)
- `column_image_url` - Custom image for the column
- `column_image_source` - Where image came from (upload/product)
- `column_badge` - Badge to display (new/offers/free-shipping/featured)

When building the mega menu, the service fetches subcategory configs and applies their column customizations.

## Data Types

### Input Types (Admin ’ Backend)

```typescript
type MegaMenuConfigInput = {
  categoryId: string
  layout?: "default" | "thumbnail-grid"
  tagline?: string | null
  columns?: MegaMenuColumnConfig[] | null
  featured?: MegaMenuFeaturedCardConfig[] | null
  submenuCategoryIds?: string[] | null
  metadata?: Record<string, unknown> | null
  // Parent category config
  displayMode?: "simple-dropdown" | "columns" | null
  // Subcategory column config
  columnLayout?: "image" | "image-with-text" | "subcategory-icons" | "text-and-icons" | null
  columnImageUrl?: string | null
  columnImageSource?: "upload" | "product" | null
  columnBadge?: "new" | "offers" | "free-shipping" | "featured" | null
}
```

### Output Types (Backend ’ Storefront)

```typescript
type MegaMenuContent = {
  layout: "default" | "thumbnail-grid"
  tagline?: string | null
  columns: MegaMenuColumn[]
  featured?: MegaMenuFeaturedCard[]
}

type MegaMenuColumn = {
  heading?: string
  description?: string
  imageUrl?: string
  items: MegaMenuLink[]
  columnLayout?: "image" | "image-with-text" | "subcategory-icons" | "text-and-icons"
  badge?: "new" | "offers" | "free-shipping" | "featured"
  categoryId?: string
}

type MegaMenuLink = {
  label: string
  href: string
  description?: string
  badge?: string
  icon?: string
  thumbnailUrl?: string
}

type MegaMenuFeaturedCard = {
  eyebrow?: string
  label: string
  href: string
  description?: string
  ctaLabel?: string
  imageUrl?: string
}
```

## Development Workflow

### Adding a New Category Mega Menu

1. **Via Admin UI**:
   - Go to `/admin/catalog/mega-menu`
   - Find the category in the list
   - Click "Edit"
   - Configure layout, tagline, and submenu categories
   - Save

2. **Via Category Page**:
   - Navigate to category detail page
   - Scroll to "Mega Menu" widget
   - Configure settings inline
   - Save

### Automatic Submenu Generation

If you want the mega menu to automatically show subcategories:

1. In category config, add category IDs to `submenuCategoryIds`
2. Leave `columns` empty (or set to `[]`)
3. The service will automatically build columns from those categories
4. Subcategory configs (layout, badge, image) will be applied

### Manual Column Configuration

For full control over mega menu content:

1. Edit the category config
2. Set `columns` to a JSON array:

```json
[
  {
    "heading": "Featured Items",
    "description": "Our top picks",
    "items": [
      {
        "label": "New Arrivals",
        "href": "/new",
        "badge": "NEW",
        "icon": "("
      }
    ]
  }
]
```

3. This overrides automatic submenu generation

### Featured Cards

Add promotional cards to any mega menu:

```json
[
  {
    "eyebrow": "Limited Time",
    "label": "Summer Sale",
    "href": "/sales/summer",
    "description": "Up to 50% off selected items",
    "ctaLabel": "Shop Now",
    "imageUrl": "/images/summer-promo.jpg"
  }
]
```

## Customization

### Adding New Layouts

1. Add layout type to `types.ts`:
   ```typescript
   export type MegaMenuLayout = "default" | "thumbnail-grid" | "your-new-layout"
   ```

2. Update model in `models/mega-menu-config.ts`:
   ```typescript
   layout: model.enum(["default", "thumbnail-grid", "your-new-layout"]).default("default")
   ```

3. Add rendering logic in storefront `mega-menu/index.tsx`:
   ```typescript
   const renderYourNewLayout = () => { /* ... */ }
   ```

4. Generate and run migration:
   ```bash
   cd apps/server
   bunx medusa db:generate mega_menu
   bunx medusa db:migrate
   ```

### Styling

The storefront component uses Tailwind CSS classes and supports dark mode:

- Badge styles: `BADGE_STYLES` object in [mega-menu/index.tsx:47](../../apps/storefront1/src/modules/layout/components/mega-menu/index.tsx#L47)
- Layout classes: Responsive grid with breakpoints
- Animation: Framer Motion variants for stagger effects

## Testing

### Admin Testing

1. Navigate to `/admin/catalog/mega-menu`
2. Create global config with test data
3. Create category-specific configs
4. Verify preview renders correctly
5. Check inheritance by viewing categories without custom config

### Storefront Testing

1. Navigate to a page with the mega menu
2. Hover over navigation items with mega menu configs
3. Verify layout renders correctly
4. Test different layouts (default vs thumbnail-grid)
5. Verify links navigate correctly

## Troubleshooting

### Mega Menu Not Appearing

1. Check if category has a config: `GET /admin/mega-menu/:category_id`
2. Check global config: `GET /admin/mega-menu/global`
3. Verify navigation API returns mega menu data: `GET /store/navigation`
4. Check browser console for errors

### Configuration Not Saving

1. Check admin API response for validation errors
2. Verify JSON syntax for columns/featured arrays
3. Check network tab for failed requests
4. Review server logs for backend errors

### Preview Not Matching Storefront

1. Verify category data is being passed correctly to `buildPreview()`
2. Check if `submenuCategoryIds` reference valid categories
3. Ensure `categoryId` references in columns exist in the database
4. Clear storefront cache: navigation data is cached

### Column Customization Not Showing

1. Verify parent category has `display_mode: "columns"` set
2. Check subcategory config has column fields set (layout, image, badge)
3. Ensure `submenuCategoryIds` includes the subcategory ID
4. Check service correctly fetches and applies subcategory configs in `buildAutomaticColumns()`

## File Reference

### Backend Files

```
apps/server/src/
   modules/mega-menu/
      index.ts                          # Module definition
      service.ts                        # Core business logic
      types.ts                          # TypeScript types
      models/
         mega-menu-config.ts          # Database model
      migrations/                       # DB migrations

   api/
      admin/mega-menu/
         global/route.ts              # Global config API
         categories/route.ts          # Categories list API
         [category_id]/route.ts       # Category config API
         utils.ts                     # Shared utilities
      store/
          navigation/route.ts          # Public navigation API

   admin/
       routes/catalog/mega-menu/
          page.tsx                     # Main admin page
       widgets/
           category-mega-menu-widget.tsx # Category widget
```

### Storefront Files

```
apps/storefront1/src/
   modules/layout/components/
      mega-menu/
          index.tsx                     # Mega menu component

   lib/data/
       navigation.ts                     # Navigation data fetcher
```

## API Examples

### Create Global Config

```bash
curl -X PUT http://localhost:9000/admin/mega-menu/global \
  -H "Content-Type: application/json" \
  -d '{
    "layout": "default",
    "tagline": "Discover our collections",
    "columns": [],
    "featured": []
  }'
```

### Create Category Config

```bash
curl -X PUT http://localhost:9000/admin/mega-menu/{category_id} \
  -H "Content-Type: application/json" \
  -d '{
    "layout": "thumbnail-grid",
    "tagline": "Explore our range",
    "submenuCategoryIds": ["cat_123", "cat_456"],
    "columns": [],
    "featured": []
  }'
```

### Configure Parent Category Display Mode

```bash
curl -X PUT http://localhost:9000/admin/mega-menu/{parent_category_id} \
  -H "Content-Type: application/json" \
  -d '{
    "displayMode": "columns"
  }'
```

### Configure Subcategory Column Appearance

```bash
curl -X PUT http://localhost:9000/admin/mega-menu/{subcategory_id} \
  -H "Content-Type: application/json" \
  -d '{
    "columnLayout": "image-with-text",
    "columnImageUrl": "https://example.com/image.jpg",
    "columnImageSource": "upload",
    "columnBadge": "new"
  }'
```

### Fetch Navigation

```bash
curl http://localhost:9000/store/navigation
```

Response:
```json
{
  "items": [
    {
      "id": "cat_123",
      "label": "Clothing",
      "href": "/store?category=clothing",
      "children": [],
      "megaMenu": {
        "layout": "default",
        "tagline": "Discover our collections",
        "columns": [
          {
            "heading": "New Arrivals",
            "items": [
              {
                "label": "T-Shirts",
                "href": "/store?category=tshirts",
                "badge": "NEW"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Future Enhancements

- **Visual Editor**: Drag-and-drop column builder in admin UI
- **Image Library**: Built-in image browser for column/featured images
- **A/B Testing**: Test different mega menu configurations
- **Analytics**: Track click-through rates on mega menu items
- **Templates**: Pre-built mega menu templates for common use cases
- **Localization**: Multi-language support for mega menu content
