// New menu layout types
export type MegaMenuLayout = "no-menu" | "simple-dropdown" | "rich-columns"

// Legacy types (kept for backward compatibility)
export type MegaMenuLegacyLayout = "default" | "thumbnail-grid"
export type MegaMenuDisplayMode = "simple-dropdown" | "columns"
export type MegaMenuColumnLayout = "image" | "image-with-text" | "subcategory-icons" | "text-and-icons"
export type MegaMenuColumnImageSource = "upload" | "product"
export type MegaMenuColumnBadge = "new" | "offers" | "free-shipping" | "featured"

/**
 * Common LucideReact icon names for mega-menu usage.
 * These icons are commonly used in ecommerce navigation menus.
 *
 * @see https://lucide.dev/icons for complete list of available icons
 *
 * Note: Any valid LucideReact icon name string is accepted - this type union
 * provides autocomplete support for commonly used icons while remaining extensible.
 */
export type LucideIconName =
  // Shopping & Commerce
  | "ShoppingBag" | "ShoppingCart" | "Store" | "CreditCard" | "Receipt"
  | "Tag" | "Ticket" | "Package" | "PackageCheck" | "PackageOpen"
  // Fashion & Apparel
  | "Shirt" | "Watch" | "Glasses" | "Crown" | "Gem"
  | "Sparkles" | "Palette" | "Brush"
  // Accessories & Items
  | "Gift" | "Heart" | "Star" | "Award" | "BadgeCheck"
  | "Headphones" | "Camera" | "Music" | "Monitor" | "Laptop"
  // Service & Benefits
  | "Truck" | "Shield" | "ShieldCheck" | "Clock" | "Zap"
  | "ThumbsUp" | "Percent" | "DollarSign"
  // Navigation & UI
  | "Home" | "TrendingUp" | "Flame" | "Coffee"
  | "ChevronRight" | "ArrowRight" | "ExternalLink"
  // Categories
  | "Users" | "User" | "Baby" | "PawPrint" | "Dumbbell"
  | "Briefcase" | "Backpack" | "Luggage"
  // Seasonal & Special
  | "Snowflake" | "Sun" | "CloudRain" | "Leaf" | "Flower"
  | "PartyPopper" | "Sparkle" | "Stars"
  // Allow any string for extensibility
  | (string & {})

/**
 * Type guard to check if a string is a recognized LucideReact icon name.
 * Provides runtime validation while maintaining flexibility for new icons.
 *
 * @param icon - The icon name to validate
 * @returns true if the icon name appears to be valid
 */
export function isValidLucideIconName(icon: string | null | undefined): icon is LucideIconName {
  if (!icon || typeof icon !== 'string') {
    return false
  }

  const trimmed = icon.trim()

  // Empty strings are invalid
  if (trimmed.length === 0) {
    return false
  }

  // LucideReact icons follow PascalCase naming convention
  // Check for basic validity: starts with uppercase, contains only alphanumeric
  const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/
  return pascalCasePattern.test(trimmed)
}

/**
 * Commonly used LucideReact icons for mega-menu categories.
 * Useful reference list for frontend implementations.
 */
export const COMMON_MENU_ICONS: LucideIconName[] = [
  'ShoppingBag', 'Heart', 'Star', 'Sparkles', 'Truck', 'Shield',
  'Package', 'Shirt', 'Watch', 'Glasses', 'Home', 'TrendingUp',
  'Award', 'Gift', 'Zap', 'Coffee', 'Music', 'Camera',
  'Headphones', 'Monitor', 'Crown', 'Tag', 'Store', 'Gem'
]

export type MegaMenuLinkConfig = {
  label?: string | null
  href?: string | null
  description?: string | null
  badge?: string | null
  /**
   * LucideReact icon name (e.g., 'ShoppingBag', 'Heart', 'Star').
   * @see https://lucide.dev/icons for available icons
   * @see LucideIconName type for commonly used icons
   */
  icon?: LucideIconName | null
  thumbnailUrl?: string | null
  categoryId?: string | null
  metadata?: Record<string, unknown> | null
}

export type MegaMenuColumnConfig = {
  heading?: string | null
  description?: string | null
  imageUrl?: string | null
  items?: MegaMenuLinkConfig[] | null
}

export type MegaMenuFeaturedCardConfig = {
  eyebrow?: string | null
  label?: string | null
  href?: string | null
  description?: string | null
  ctaLabel?: string | null
  imageUrl?: string | null
  metadata?: Record<string, unknown> | null
}

export type MegaMenuConfigInput = {
  categoryId: string

  // Global config field (only used for global config)
  defaultMenuLayout?: MegaMenuLayout | null

  // Per-category menu layout (inherits from global if not set)
  menuLayout?: MegaMenuLayout | null

  // Category-level content fields (not used for global config)
  tagline?: string | null
  columns?: MegaMenuColumnConfig[] | null
  featured?: MegaMenuFeaturedCardConfig[] | null
  submenuCategoryIds?: string[] | null
  metadata?: Record<string, unknown> | null

  // Second-level category configuration
  displayAsColumn?: boolean | null // true = title/image/description, false = third-level list
  columnTitle?: string | null
  columnDescription?: string | null
  columnImageUrl?: string | null
  columnImageSource?: MegaMenuColumnImageSource | null
  columnBadge?: MegaMenuColumnBadge | null

  // Third-level category configuration
  /**
   * LucideReact icon name for third-level category display (e.g., 'ShoppingBag', 'Heart', 'Star').
   * Used when displaying categories in icon-based layouts.
   * @see https://lucide.dev/icons for available icons
   * @see LucideIconName type for commonly used icons
   */
  icon?: LucideIconName | null
  thumbnailUrl?: string | null
  selectedThumbnailProductId?: string | null
  selectedThumbnailImageId?: string | null
  title?: string | null
  subtitle?: string | null

  // Optional field to exclude category from menu while retaining config
  excludedFromMenu?: boolean

  // Legacy fields (kept for backward compatibility)
  layout?: MegaMenuLegacyLayout
  displayMode?: MegaMenuDisplayMode | null
  columnLayout?: MegaMenuColumnLayout | null
}

export type MegaMenuConfigDTO = {
  id: string
  categoryId: string

  // Global config field
  defaultMenuLayout: MegaMenuLayout | null

  // Per-category menu layout
  menuLayout: MegaMenuLayout | null

  // Category-level content fields
  tagline: string | null
  columns: MegaMenuColumnConfig[]
  featured: MegaMenuFeaturedCardConfig[]
  submenuCategoryIds: string[]
  metadata: Record<string, unknown> | null

  // Second-level category configuration
  displayAsColumn: boolean | null
  columnTitle: string | null
  columnDescription: string | null
  columnImageUrl: string | null
  columnImageSource: MegaMenuColumnImageSource | null
  columnBadge: MegaMenuColumnBadge | null

  // Third-level category configuration
  /**
   * LucideReact icon name for third-level category display.
   * @see https://lucide.dev/icons for available icons
   */
  icon: LucideIconName | null
  thumbnailUrl: string | null
  selectedThumbnailProductId: string | null
  selectedThumbnailImageId: string | null
  title: string | null
  subtitle: string | null

  // Optional field to exclude category from menu
  excludedFromMenu: boolean

  // Legacy fields
  layout: MegaMenuLegacyLayout | null
  displayMode: MegaMenuDisplayMode | null
  columnLayout: MegaMenuColumnLayout | null

  createdAt: Date
  updatedAt: Date
}

export type MegaMenuLink = {
  label: string
  href: string
  description?: string
  badge?: string
  /**
   * LucideReact icon name (e.g., 'ShoppingBag', 'Heart', 'Star').
   * @see https://lucide.dev/icons for available icons
   */
  icon?: LucideIconName
  thumbnailUrl?: string
}

export type MegaMenuColumn = {
  heading?: string
  description?: string
  imageUrl?: string
  items: MegaMenuLink[]
  // Subcategory-specific column configuration
  columnLayout?: MegaMenuColumnLayout
  badge?: MegaMenuColumnBadge
  categoryId?: string
}

export type MegaMenuFeaturedCard = {
  eyebrow?: string
  label: string
  href: string
  description?: string
  ctaLabel?: string
  imageUrl?: string
}

export type MegaMenuContent = {
  menuLayout: MegaMenuLayout
  tagline?: string | null
  columns: MegaMenuColumn[]
  featured?: MegaMenuFeaturedCard[]
}

export type MegaMenuNavigationItem = {
  id: string
  label: string
  href: string
  subLabel?: string
  menuLayout?: MegaMenuLayout | null
  children: MegaMenuNavigationItem[]
  megaMenu?: MegaMenuContent | null
  // Second-level category fields
  displayAsColumn?: boolean | null
  columnTitle?: string | null
  columnDescription?: string | null
  columnImageUrl?: string | null
  columnBadge?: MegaMenuColumnBadge | null
  // Third-level category fields
  /**
   * LucideReact icon name for category display.
   * @see https://lucide.dev/icons for available icons
   */
  icon?: LucideIconName | null
  thumbnailUrl?: string | null
  title?: string | null
  subtitle?: string | null
}

export type MegaMenuModuleOptions = {
  baseHref?: string
  defaultLayout?: MegaMenuLayout
  defaultTagline?: string
}

export const MEGA_MENU_MODULE = "mega_menu"
export const MEGA_MENU_GLOBAL_ID = "__mega_menu_global__"
