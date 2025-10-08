# Task Delegation Plan: Mega Menu Image & Icon Selectors

## Overview
Enhance the mega-menu admin UI to use product image selection (like category nav images) for thumbnails and implement a LucideReact icon selector with preview instead of text input fields.

## Current State Analysis

### Category Nav Images Extension
- **Product Image Selection Modal**: Full-featured modal that:
  - Lists products from the category
  - Displays product images in a grid
  - Allows selection of specific image
  - Shows preview of selected image
  - Saves `selected_product_id` and `selected_product_image_id`

- **Backend API**: `/admin/category-selector-by-product/[categoryId]/products`
  - Returns products with their images
  - Resolves image URLs

### Mega Menu Extension
- **Current Implementation**: Text input fields for:
  - `thumbnailUrl` (line 879-887, 943-951 in mega-menu/page.tsx)
  - `icon` (line 869-876, 933-940 in mega-menu/page.tsx)
  - `columnImageUrl` (line 822-831 in mega-menu/page.tsx)

- **Database Model** (mega-menu-config.ts):
  - `thumbnail_url`: text field
  - `icon`: text field
  - `column_image_url`: text field
  - `column_image_source`: enum ["upload", "product"] (exists but unused)

## Implementation Plan

### Phase 1: Backend - Product Image Selection for Thumbnails
**Agent**: `medusa-backend-developer`

**Tasks**:
1. Create API endpoint: `/admin/mega-menu/[category_id]/products`
   - Similar to category-selector-by-product endpoint
   - Return products from the category with image data
   - Support search/filtering

2. Extend mega-menu API routes to handle:
   - `selected_thumbnail_product_id`
   - `selected_thumbnail_image_id`
   - Resolve URLs when returning configs

3. Add migration for new fields:
   - `selected_thumbnail_product_id` (text, nullable)
   - `selected_thumbnail_image_id` (text, nullable)
   - Keep `thumbnail_url` for backward compatibility

4. Update MegaMenuConfig model and types

**Files to Modify**:
- `apps/server/src/api/admin/mega-menu/[category_id]/route.ts`
- `apps/server/src/modules/mega-menu/models/mega-menu-config.ts`
- `apps/server/src/modules/mega-menu/types.ts`
- Create: `apps/server/src/api/admin/mega-menu/[category_id]/products/route.ts`
- Create migration file

### Phase 2: Backend - Icon Field Enhancement
**Agent**: `medusa-backend-developer`

**Tasks**:
1. Add migration to update icon field metadata
2. Update types to support LucideReact icon names
3. Add validation for valid icon names (optional)

**Files to Modify**:
- `apps/server/src/modules/mega-menu/types.ts`
- Create migration if needed for constraints

### Phase 3: Admin UI - Product Image Selector for Thumbnails
**Agent**: `react-frontend-developer`

**Tasks**:
1. Create `ProductImageModal` component (can reuse/adapt from category-selector-by-product)
   - Product list with search
   - Image grid for selected product
   - Preview of selected image
   - Save handler

2. Update mega-menu admin page to:
   - Replace text input with "Select Image" button for thumbnail fields
   - Show preview of currently selected image
   - Handle modal open/close state
   - Save selected product/image IDs

3. Apply to both:
   - Third-level category `thumbnailUrl` field
   - Second-level category `thumbnailUrl` field

**Files to Modify**:
- `apps/server/src/admin/routes/catalog/mega-menu/page.tsx`
- Create: `apps/server/src/admin/routes/catalog/mega-menu/components/ProductImageModal.tsx` (or inline)

### Phase 4: Admin UI - LucideReact Icon Selector
**Agent**: `react-frontend-developer`

**Tasks**:
1. Install/verify `lucide-react` dependency
2. Create `IconSelector` component:
   - Searchable dropdown/modal with icon preview
   - Display icon name + rendered icon
   - Grid layout showing popular icons
   - Search functionality
   - Selected icon preview in trigger button

3. Replace text input fields for `icon` with IconSelector:
   - Second-level categories (line 869-876)
   - Third-level categories (line 933-940)

4. Show selected icon preview next to selector

**Files to Modify**:
- `apps/server/src/admin/routes/catalog/mega-menu/page.tsx`
- Create: `apps/server/src/admin/routes/catalog/mega-menu/components/IconSelector.tsx`
- `apps/server/package.json` (verify lucide-react dependency)

**Icon Selector Design**:
```tsx
// Suggested component structure
<Select>
  <Select.Trigger>
    {selectedIcon ? (
      <div className="flex items-center gap-2">
        <LucideIcon name={selectedIcon} size={16} />
        <span>{selectedIcon}</span>
      </div>
    ) : (
      <span>Select an icon...</span>
    )}
  </Select.Trigger>
  <Select.Content>
    <Input placeholder="Search icons..." onChange={handleSearch} />
    <div className="grid grid-cols-4 gap-2">
      {filteredIcons.map(icon => (
        <button onClick={() => selectIcon(icon.name)}>
          <icon.component size={20} />
          <span>{icon.name}</span>
        </button>
      ))}
    </div>
  </Select.Content>
</Select>
```

### Phase 5: Testing
**Agent**: `backend-qa-testing-specialist`

**Tasks**:
1. Test product image selection for thumbnails:
   - Verify products API endpoint
   - Test image selection and saving
   - Verify URL resolution
   - Test preview display

2. Test icon selector:
   - Verify icon selection and saving
   - Test search functionality
   - Verify icon rendering in frontend

3. Test backward compatibility:
   - Ensure existing text URLs still work
   - Test migration path

**Files to Test**:
- API endpoints: `/admin/mega-menu/[category_id]/products`
- Admin UI: Product image modal, icon selector
- Storefront: Verify selected images/icons display correctly

## Implementation Order

1. **Backend Developer** - Phase 1 & 2 (product endpoints + icon types)
2. **React Frontend Developer** - Phase 3 & 4 (image selector + icon selector)
3. **QA Testing Specialist** - Phase 5 (comprehensive testing)

## Success Criteria

- [ ] Thumbnail fields use product image selection like category nav images
- [ ] Icon fields use LucideReact icon selector with visual preview
- [ ] Selected images show preview in admin UI
- [ ] Selected icons show preview in admin UI
- [ ] Icons can be resized properly (LucideReact advantage)
- [ ] All changes are backward compatible
- [ ] API endpoints return proper image URLs
- [ ] Admin UI updates save correctly
- [ ] Storefront displays selected images/icons correctly

## Notes

- Keep existing `thumbnail_url` and `icon` text fields for backward compatibility
- The `column_image_source` enum already exists but can be leveraged
- Consider caching icon list for performance
- LucideReact icons are tree-shakeable and resize-friendly
- Popular icons to include: ShoppingBag, Heart, Star, Sparkles, Truck, Shield, etc.
