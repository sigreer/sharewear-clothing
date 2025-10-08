# User Requirements - Megamenu Image and Icon Selectors

## Current State
- The megamenu extension displays correctly in a tree format
- Two fields need improvement:
  1. **Thumbnail field** - Currently asks for a URL (text input)
  2. **Icon field** - Currently asks for an icon name/identifier (text input)

## Related Extension
- A "category nav images" extension already exists with a working product image selector
- This selector allows selecting from product images and displays a preview

## Requirement 1: Product Image Selector for Thumbnails
**Current Behavior:** Thumbnail field accepts URL as text input
**Required Behavior:** Replace with product image selector (similar to category nav images extension)
- User should be able to select from existing product images
- Display preview of selected image
- Reuse the same pattern/component from category nav images extension

## Requirement 2: Lucide React Icon Selector
**Current Behavior:** Icon field accepts icon name/identifier as text input
**Required Behavior:** Replace with visual icon selector
- Use **Lucide React icons** (NOT Medusa icons - they can't be resized properly)
- Display icons visually in the selector (not just names)
- Show selected icon preview
- Allow searching/browsing available icons
- Similar UX to the image selector but for icons

## Technical Constraints
- **Framework:** Medusa v2 Admin UI (React-based)
- **Icons:** Must use Lucide React icons, NOT Medusa icons
- **Pattern Reuse:** Should follow the same UX pattern as category nav images selector
- **No Breaking Changes:** Maintain backward compatibility with existing megamenu data

## Acceptance Criteria

### Thumbnail Field:
- Text URL input replaced with product image selector
- User can browse and select from available product images
- Selected image displays as preview
- Saves image URL to database (same format as before)
- Works in both main megamenu page and category widget (if applicable)

### Icon Field:
- Text input replaced with visual icon selector
- Uses Lucide React icons exclusively
- Icons displayed visually in selector (not just names)
- Search/browse functionality for icons
- Selected icon displays as preview
- Saves icon identifier to database
- Icons can be properly resized in the UI
- Works in both main megamenu page and category widget (if applicable)

### Testing Requirements:
- Admin UI tested with Playwright MCP
- Both selectors work correctly
- Image selection saves and persists
- Icon selection saves and persists
- Previews display correctly
- Existing megamenu configurations not broken
- Written tests for admin UI functionality
