# Mega-Menu Icon Field Guide

## Overview

The mega-menu module uses **LucideReact** icons for category and menu item visualization. The `icon` field throughout the mega-menu configuration stores LucideReact icon names as strings.

## Icon Field Usage

### Where Icons Are Used

1. **Third-Level Categories**: Icons can be displayed alongside category names in the navigation menu
2. **Menu Links**: Custom menu items in the `columns` configuration can include icons
3. **Navigation Items**: Icons are passed through to the frontend navigation data structure

### LucideReact Icon Names

All icon fields expect **PascalCase** icon names from the LucideReact library:

```typescript
// Valid examples
icon: "ShoppingBag"
icon: "Heart"
icon: "Star"
icon: "Sparkles"
icon: "Truck"

// Invalid examples
icon: "shopping-bag"  // kebab-case (invalid)
icon: "shoppingBag"   // camelCase (invalid)
icon: "SHOPPINGBAG"   // uppercase (invalid)
```

## TypeScript Type Support

### LucideIconName Type

The module exports a `LucideIconName` type that provides autocomplete for commonly used icons:

```typescript
import { LucideIconName } from "../../../../modules/mega-menu"

const icon: LucideIconName = "ShoppingBag" // TypeScript autocomplete available
```

### Common Menu Icons

A curated list of commonly used icons is available:

```typescript
import { COMMON_MENU_ICONS } from "../../../../modules/mega-menu"

// Returns: ['ShoppingBag', 'Heart', 'Star', 'Sparkles', ...]
console.log(COMMON_MENU_ICONS)
```

## Validation

### Backend Validation

The backend performs **non-blocking validation** on icon fields:

- Invalid icon names log warnings to the console
- Requests are NOT rejected for invalid icons
- This allows flexibility for new LucideReact icons

Example warning:
```
[MegaMenu] Invalid LucideReact icon name "shopping-bag" in category cat_123 icon.
Icon names should follow PascalCase convention (e.g., 'ShoppingBag', 'Heart').
See https://lucide.dev/icons for available icons.
```

### Runtime Validation Function

Use the `isValidLucideIconName()` function for validation:

```typescript
import { isValidLucideIconName } from "../../../../modules/mega-menu"

if (isValidLucideIconName("ShoppingBag")) {
  // Valid icon name
}
```

## Frontend Implementation Recommendations

### 1. Icon Component Mapping

Create a mapping of icon names to LucideReact components:

```typescript
import * as Icons from "lucide-react"

type IconName = keyof typeof Icons

function getLucideIcon(iconName: string): React.ComponentType | null {
  if (iconName in Icons) {
    return Icons[iconName as IconName]
  }
  return null
}
```

### 2. Dynamic Icon Rendering

```typescript
import * as Icons from "lucide-react"

interface IconProps {
  name: string
  className?: string
  size?: number
}

export function DynamicIcon({ name, className, size = 20 }: IconProps) {
  const IconComponent = Icons[name as keyof typeof Icons]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`)
    return null
  }

  return <IconComponent className={className} size={size} />
}
```

### 3. Icon Picker Component

For admin UI, create an icon picker with search and preview:

```typescript
import { COMMON_MENU_ICONS } from "../../../../modules/mega-menu"

export function IconPicker({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No icon</option>
      {COMMON_MENU_ICONS.map(icon => (
        <option key={icon} value={icon}>{icon}</option>
      ))}
    </select>
  )
}
```

### 4. Fallback Handling

Always handle missing or invalid icons gracefully:

```typescript
function renderIcon(iconName: string | null) {
  if (!iconName) return null

  const Icon = getLucideIcon(iconName)

  if (!Icon) {
    // Fallback to a default icon
    return <DefaultIcon />
  }

  return <Icon />
}
```

## API Routes with Icon Support

### PUT /admin/mega-menu/:category_id

Update category configuration including icon:

```typescript
await fetch(`/admin/mega-menu/${categoryId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    icon: 'ShoppingBag',
    title: 'Shop',
    // ... other fields
  })
})
```

### PUT /admin/mega-menu/global

Update global config with icons in column items:

```typescript
await fetch('/admin/mega-menu/global', {
  method: 'PUT',
  body: JSON.stringify({
    columns: [
      {
        heading: 'Featured',
        items: [
          {
            label: 'New Arrivals',
            href: '/new',
            icon: 'Sparkles'
          },
          {
            label: 'Best Sellers',
            href: '/best',
            icon: 'TrendingUp'
          }
        ]
      }
    ]
  })
})
```

## Resources

- **LucideReact Documentation**: https://lucide.dev/icons
- **Icon Browser**: Browse all available icons at https://lucide.dev
- **Type Definitions**: See `apps/server/src/modules/mega-menu/types.ts`

## Migration Notes

### Existing Data

- All existing icon field values are preserved
- No database migration required
- Invalid icon names will log warnings but continue to work
- Frontend components should handle any string value gracefully

### Adding New Icons

As LucideReact adds new icons:
1. They can be used immediately (any string is accepted)
2. No backend code changes required
3. Frontend may need to update the lucide-react dependency
4. Consider adding popular icons to `COMMON_MENU_ICONS` list
