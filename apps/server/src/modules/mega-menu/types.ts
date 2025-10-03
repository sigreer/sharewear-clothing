// New menu layout types
export type MegaMenuLayout = "no-menu" | "simple-dropdown" | "rich-columns"

// Legacy types (kept for backward compatibility)
export type MegaMenuLegacyLayout = "default" | "thumbnail-grid"
export type MegaMenuDisplayMode = "simple-dropdown" | "columns"
export type MegaMenuColumnLayout = "image" | "image-with-text" | "subcategory-icons" | "text-and-icons"
export type MegaMenuColumnImageSource = "upload" | "product"
export type MegaMenuColumnBadge = "new" | "offers" | "free-shipping" | "featured"

export type MegaMenuLinkConfig = {
  label?: string | null
  href?: string | null
  description?: string | null
  badge?: string | null
  icon?: string | null
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
  icon?: string | null
  thumbnailUrl?: string | null
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
  icon: string | null
  thumbnailUrl: string | null
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
  icon?: string
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
  icon?: string | null
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
