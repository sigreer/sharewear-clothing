# Megamenu Storefront Implementation Guide

## Overview

This document provides guidance for implementing the new three-tier megamenu structure in the storefront. The backend now provides a hierarchical navigation JSON structure with three levels of categories, each with specific configuration options.

## Navigation API Endpoint

**Endpoint**: `GET /store/navigation`

**Headers Required**:
```http
x-publishable-api-key: your_publishable_key_here
```

**Example Response** (see `sample-navigation-output.json` for full example):
```json
{
  "items": [
    {
      "id": "pcat_xxx",
      "label": "T-Shirts",
      "href": "/store?category=t-shirts",
      "subLabel": "",
      "children": [...],
      "menuLayout": "rich-columns"
    }
  ]
}
```

## Menu Layout Types

### 1. No Menu (`no-menu`)
Category has no dropdown menu. Only the link to the category page is shown.

**Implementation**:
- Render as simple link with no hover/click interaction
- No children displayed

**Example**:
```tsx
{item.menuLayout === 'no-menu' && (
  <a href={item.href}>{item.label}</a>
)}
```

### 2. Simple Dropdown (`simple-dropdown`)
Basic text-based dropdown list showing child categories.

**Implementation**:
- Show dropdown on hover or click
- Display children as simple text links
- No images, icons, or special formatting

**Example**:
```tsx
{item.menuLayout === 'simple-dropdown' && (
  <div className="dropdown">
    <a href={item.href}>{item.label}</a>
    <div className="dropdown-menu">
      {item.children.map(child => (
        <a key={child.id} href={child.href}>{child.label}</a>
      ))}
    </div>
  </div>
)}
```

### 3. Rich Columns (`rich-columns`)
Multi-column layout with images, descriptions, and enhanced styling.

**Implementation**:
- Full-width dropdown panel
- Second-level categories can be:
  - **Display as Column**: Title/image/description column (when `displayAsColumn: true`)
  - **List of Third-level**: Shows third-level categories with icons/thumbnails
- Supports badges, images, and rich formatting

**Example**:
```tsx
{item.menuLayout === 'rich-columns' && (
  <div className="mega-menu">
    <a href={item.href}>{item.label}</a>
    <div className="mega-menu-panel">
      {item.children.map(secondLevel => (
        <div key={secondLevel.id} className="mega-menu-column">
          {secondLevel.displayAsColumn ? (
            // Render as title/image/description column
            <div className="column-display">
              {secondLevel.columnImageUrl && (
                <img src={secondLevel.columnImageUrl} alt={secondLevel.columnTitle || secondLevel.label} />
              )}
              {secondLevel.columnBadge && (
                <span className="badge">{secondLevel.columnBadge}</span>
              )}
              <h3>{secondLevel.columnTitle || secondLevel.label}</h3>
              {secondLevel.columnDescription && (
                <p>{secondLevel.columnDescription}</p>
              )}
            </div>
          ) : (
            // Render as list of third-level categories
            <div className="category-list">
              <h3>{secondLevel.label}</h3>
              {secondLevel.children.map(thirdLevel => (
                <a key={thirdLevel.id} href={thirdLevel.href} className="third-level-item">
                  {thirdLevel.icon && <span className="icon">{thirdLevel.icon}</span>}
                  {thirdLevel.thumbnailUrl && (
                    <img src={thirdLevel.thumbnailUrl} alt={thirdLevel.title || thirdLevel.label} />
                  )}
                  <div>
                    <span className="title">{thirdLevel.title || thirdLevel.label}</span>
                    {thirdLevel.subtitle && (
                      <span className="subtitle">{thirdLevel.subtitle}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

## JSON Structure Reference

### Top-level Category Fields
- `id` (string): Category ID
- `label` (string): Display name
- `href` (string): Link to category page
- `subLabel` (string): Optional subtitle
- `children` (array): Second-level categories
- `menuLayout` (string): `"no-menu"` | `"simple-dropdown"` | `"rich-columns"`

### Second-level Category Fields (when parent has `rich-columns`)
- All top-level fields, plus:
- `displayAsColumn` (boolean | null): Whether to display as title/image/description column
- **When `displayAsColumn: true`:**
  - `columnTitle` (string | null): Custom title for column display
  - `columnDescription` (string | null): Description text
  - `columnImageUrl` (string | null): Image URL for column
  - `columnBadge` (string | null): Badge type: `"new"` | `"offers"` | `"free-shipping"` | `"featured"`
- **When `displayAsColumn: false` (lists third-level categories):**
  - `icon` (string | null): Icon for this second-level item when displayed in parent menu
  - `thumbnailUrl` (string | null): Thumbnail for this second-level item
  - `title` (string | null): Custom display title override
  - `subtitle` (string | null): Additional subtitle text
  - Plus all column fields above (still available but typically used when displaying as column)

### Third-level Category Fields (when grandparent has `rich-columns`)
- All basic fields, plus:
- `icon` (string | null): Icon identifier or class name
- `thumbnailUrl` (string | null): Thumbnail image URL
- `title` (string | null): Custom display title
- `subtitle` (string | null): Additional subtitle text
- `menuLayout` (string | null): Can specify its own layout if it has children

## Implementation Steps

### 1. Fetch Navigation Data

```tsx
const fetchNavigation = async () => {
  const response = await fetch('http://your-backend.com/store/navigation', {
    headers: {
      'x-publishable-api-key': process.env.NEXT_PUBLIC_PUBLISHABLE_API_KEY
    }
  })
  return response.json()
}
```

### 2. Create Navigation Component

```tsx
import { useState, useEffect } from 'react'

interface NavigationItem {
  id: string
  label: string
  href: string
  subLabel?: string
  children: NavigationItem[]
  menuLayout?: 'no-menu' | 'simple-dropdown' | 'rich-columns'
  // Second-level fields
  displayAsColumn?: boolean | null
  columnTitle?: string | null
  columnDescription?: string | null
  columnImageUrl?: string | null
  columnBadge?: string | null
  // Third-level fields
  icon?: string | null
  thumbnailUrl?: string | null
  title?: string | null
  subtitle?: string | null
}

export const MegaMenu = () => {
  const [navigation, setNavigation] = useState<{ items: NavigationItem[] }>({ items: [] })

  useEffect(() => {
    fetchNavigation().then(setNavigation)
  }, [])

  return (
    <nav className="main-navigation">
      {navigation.items.map(item => (
        <NavigationItem key={item.id} item={item} />
      ))}
    </nav>
  )
}
```

### 3. Implement Menu Layout Logic

Create separate components for each menu layout type:

```tsx
const NavigationItem = ({ item }: { item: NavigationItem }) => {
  switch (item.menuLayout) {
    case 'no-menu':
      return <NoMenuLink item={item} />
    case 'simple-dropdown':
      return <SimpleDropdown item={item} />
    case 'rich-columns':
      return <RichColumnsMenu item={item} />
    default:
      return <SimpleDropdown item={item} />
  }
}
```

## Styling Recommendations

### CSS Structure

```css
/* Base navigation */
.main-navigation {
  display: flex;
  gap: 2rem;
  align-items: center;
}

/* Simple dropdown */
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.5rem 0;
  min-width: 200px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Rich columns mega menu */
.mega-menu-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.mega-menu-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Column display (second-level as title/image) */
.column-display img {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

/* Third-level items */
.third-level-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.third-level-item:hover {
  background-color: #f3f4f6;
}

.third-level-item img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.375rem;
}

/* Badge styles */
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.new { background: #dbeafe; color: #1e40af; }
.badge.offers { background: #fee2e2; color: #991b1b; }
.badge.free-shipping { background: #d1fae5; color: #065f46; }
.badge.featured { background: #fef3c7; color: #92400e; }
```

## Mobile Considerations

For mobile devices, consider:

1. **Accordion-style Navigation**: Convert dropdowns to expandable accordions
2. **Full-screen Menus**: Use full-screen overlay for rich-columns layout
3. **Touch Interactions**: Replace hover states with tap/click
4. **Simplified Layout**: Reduce column count in rich-columns on smaller screens

```tsx
const isMobile = window.innerWidth < 768

{isMobile ? (
  <MobileAccordionMenu items={navigation.items} />
) : (
  <DesktopMegaMenu items={navigation.items} />
)}
```

## Performance Optimization

### 1. Data Caching
Cache navigation data to reduce API calls:

```tsx
const NAVIGATION_CACHE_KEY = 'megamenu-navigation'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const getCachedNavigation = async () => {
  const cached = localStorage.getItem(NAVIGATION_CACHE_KEY)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data
    }
  }

  const fresh = await fetchNavigation()
  localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify({
    data: fresh,
    timestamp: Date.now()
  }))
  return fresh
}
```

### 2. Lazy Loading Images
Use lazy loading for column images and thumbnails:

```tsx
<img
  src={item.columnImageUrl}
  alt={item.columnTitle}
  loading="lazy"
/>
```

### 3. Prefetch on Hover
Prefetch category pages when user hovers over menu items:

```tsx
const handleMouseEnter = (href: string) => {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}
```

## Accessibility

Ensure keyboard navigation and screen reader support:

```tsx
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    {items.map(item => (
      <li key={item.id} role="none">
        <a
          href={item.href}
          role="menuitem"
          aria-haspopup={item.menuLayout !== 'no-menu'}
          aria-expanded={isOpen}
          onKeyDown={handleKeyDown}
        >
          {item.label}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

## Testing Checklist

- [ ] Navigation data loads successfully from API
- [ ] All three menu layout types render correctly
- [ ] Hover interactions work smoothly (desktop)
- [ ] Touch interactions work correctly (mobile)
- [ ] Images load and display properly
- [ ] Badges display with correct styling
- [ ] Keyboard navigation works
- [ ] Screen readers announce menu items correctly
- [ ] Links navigate to correct category pages
- [ ] Mobile accordion/full-screen menu functions properly
- [ ] Performance is acceptable (< 100ms to open menu)
- [ ] No layout shifts or flashing content

## Migration from Old Megamenu

If migrating from an existing megamenu implementation:

1. **Backend Migration Complete**: Ensure the backend restructure is complete and the new navigation API returns data
2. **Feature Flag**: Use a feature flag to toggle between old and new implementations
3. **Gradual Rollout**: Test new implementation in staging before production
4. **Fallback**: Keep old implementation code for quick rollback if needed
5. **Monitor**: Watch for errors and performance issues after deployment

## Example Repositories

For reference implementations, see:
- [Next.js Megamenu Example](https://github.com/example/nextjs-megamenu)
- [React Dropdown Navigation](https://github.com/example/react-dropdown)
- [Accessible Navigation Patterns](https://www.w3.org/WAI/tutorials/menus/)

## Support

For questions or issues with the megamenu implementation:
1. Check the backend API documentation in `MEDUSA_DOCS.md`
2. Review the sample JSON output in `sample-navigation-output.json`
3. Refer to the backend restructure spec in `megamenu-backend-restructure.md`
4. Contact the development team for additional assistance
