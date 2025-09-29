export type MegaMenuLayout = "default" | "thumbnail-grid"

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
  layout?: MegaMenuLayout
  tagline?: string | null
  columns?: MegaMenuColumnConfig[] | null
  featured?: MegaMenuFeaturedCardConfig[] | null
  submenuCategoryIds?: string[] | null
  metadata?: Record<string, unknown> | null
}

export type MegaMenuConfigDTO = {
  id: string
  categoryId: string
  layout: MegaMenuLayout
  tagline: string | null
  columns: MegaMenuColumnConfig[]
  featured: MegaMenuFeaturedCardConfig[]
  submenuCategoryIds: string[]
  metadata: Record<string, unknown> | null
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
  layout: MegaMenuLayout
  tagline?: string | null
  columns: MegaMenuColumn[]
  featured?: MegaMenuFeaturedCard[]
}

export type MegaMenuNavigationItem = {
  id: string
  label: string
  href: string
  subLabel?: string
  children: MegaMenuNavigationItem[]
  megaMenu?: MegaMenuContent | null
}

export type MegaMenuModuleOptions = {
  baseHref?: string
  defaultLayout?: MegaMenuLayout
  defaultTagline?: string
}

export const MEGA_MENU_MODULE = "mega_menu"
export const MEGA_MENU_GLOBAL_ID = "__mega_menu_global__"
