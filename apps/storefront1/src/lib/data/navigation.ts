import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"
import type { MegaMenuContent, MegaMenuColumn, MegaMenuLink } from "@modules/layout/components/mega-menu"

export type MenuLayout = "no-menu" | "simple-dropdown" | "rich-columns"
export type ColumnBadge = "new" | "offers" | "free-shipping" | "featured"
export type ColumnLayout = "image" | "image-with-text" | "subcategory-icons" | "text-and-icons"

export interface NavigationItem {
  id: string
  label: string
  href?: string
  subLabel?: string
  children: NavigationItem[]
  menuLayout?: MenuLayout | null
  megaMenu?: MegaMenuContent | null

  // Second-level category fields
  displayAsColumn?: boolean | null
  columnTitle?: string | null
  columnDescription?: string | null
  columnImageUrl?: string | null
  columnBadge?: ColumnBadge | null
  columnLayout?: ColumnLayout | null

  // Item display fields (for second and third-level categories)
  icon?: string | null
  thumbnailUrl?: string | null
  title?: string | null
  subtitle?: string | null
}

const buildMegaMenuContent = (item: any): MegaMenuContent | null => {
  if (item?.menuLayout !== "rich-columns" || !Array.isArray(item?.children) || item.children.length === 0) {
    return null
  }

  const columns: MegaMenuColumn[] = []

  for (const secondLevel of item.children) {
    if (secondLevel.displayAsColumn) {
      // Second-level category displayed as column header with image/description
      const column: MegaMenuColumn = {
        heading: secondLevel.columnTitle || secondLevel.label,
        description: secondLevel.columnDescription || undefined,
        imageUrl: secondLevel.columnImageUrl || undefined,
        items: [],
        badge: secondLevel.columnBadge as any,
        columnLayout: secondLevel.columnLayout || undefined,
        categoryId: secondLevel.id
      }

      // Add third-level items if they exist
      if (Array.isArray(secondLevel.children) && secondLevel.children.length > 0) {
        for (const thirdLevel of secondLevel.children) {
          column.items.push({
            label: thirdLevel.title || thirdLevel.label,
            href: thirdLevel.href || "#",
            description: thirdLevel.subtitle || thirdLevel.subLabel || undefined,
            icon: thirdLevel.icon || undefined,
            thumbnailUrl: thirdLevel.thumbnailUrl || undefined
          })
        }
      }

      columns.push(column)
    } else {
      // Second-level category as list header, showing third-level items
      const column: MegaMenuColumn = {
        heading: secondLevel.title || secondLevel.label,
        description: secondLevel.subtitle || secondLevel.subLabel || undefined,
        items: [],
        columnLayout: secondLevel.columnLayout || undefined,
        categoryId: secondLevel.id
      }

      // Add third-level items
      if (Array.isArray(secondLevel.children) && secondLevel.children.length > 0) {
        for (const thirdLevel of secondLevel.children) {
          column.items.push({
            label: thirdLevel.title || thirdLevel.label,
            href: thirdLevel.href || "#",
            description: thirdLevel.subtitle || thirdLevel.subLabel || undefined,
            icon: thirdLevel.icon || undefined,
            thumbnailUrl: thirdLevel.thumbnailUrl || undefined
          })
        }
      } else {
        // If no third-level items, include the second-level item itself
        column.items.push({
          label: secondLevel.title || secondLevel.label,
          href: secondLevel.href || "#",
          description: secondLevel.subtitle || secondLevel.subLabel || undefined,
          icon: secondLevel.icon || undefined,
          thumbnailUrl: secondLevel.thumbnailUrl || undefined
        })
      }

      columns.push(column)
    }
  }

  if (columns.length === 0) {
    return null
  }

  return {
    tagline: item.tagline || undefined,
    layout: "default",
    columns
  }
}

const normalizeNavigationItems = (items: any[]): NavigationItem[] => {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => {
    const normalizedChildren = normalizeNavigationItems(item?.children ?? [])

    const baseItem: NavigationItem = {
      id: typeof item?.id === "string" ? item.id : String(item?.id ?? ""),
      label: typeof item?.label === "string" ? item.label : String(item?.id ?? ""),
      href: typeof item?.href === "string" ? item.href : undefined,
      subLabel: typeof item?.subLabel === "string" ? item.subLabel : undefined,
      children: normalizedChildren,
      menuLayout: item?.menuLayout ?? null,
      megaMenu: null,

      // Second-level category fields
      displayAsColumn: item?.displayAsColumn ?? null,
      columnTitle: item?.columnTitle ?? null,
      columnDescription: item?.columnDescription ?? null,
      columnImageUrl: item?.columnImageUrl ?? null,
      columnBadge: item?.columnBadge ?? null,
      columnLayout: item?.columnLayout ?? null,

      // Item display fields
      icon: item?.icon ?? null,
      thumbnailUrl: item?.thumbnailUrl ?? null,
      title: item?.title ?? null,
      subtitle: item?.subtitle ?? null
    }

    // Build mega menu content if this is a rich-columns layout
    if (item?.menuLayout === "rich-columns") {
      baseItem.megaMenu = buildMegaMenuContent(item)
    }

    return baseItem
  })
}

export const listNavigation = async (): Promise<NavigationItem[]> => {
  const next = {
    ...(await getCacheOptions("navigation")),
  }

  return sdk.client
    .fetch<{ items: NavigationItem[] }>("/store/navigation", {
      next,
      cache: "no-store",
    })
    .then((response) => {
      console.log("Navigation API response:", response)
      return normalizeNavigationItems(response.items ?? [])
    })
    .catch((error) => {
      console.error("Navigation API error:", error)
      return []
    })
}
