import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"
import type { MegaMenuContent } from "@modules/layout/components/mega-menu"

export interface NavigationItem {
  id: string
  label: string
  href?: string
  subLabel?: string
  children: NavigationItem[]
  megaMenu?: MegaMenuContent | null
}

const normalizeNavigationItems = (items: any[]): NavigationItem[] => {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => {
    const normalizedChildren = normalizeNavigationItems(item?.children ?? [])

    return {
      id: typeof item?.id === "string" ? item.id : String(item?.id ?? ""),
      label: typeof item?.label === "string" ? item.label : String(item?.id ?? ""),
      href: typeof item?.href === "string" ? item.href : undefined,
      subLabel: typeof item?.subLabel === "string" ? item.subLabel : undefined,
      children: normalizedChildren,
      megaMenu: item?.megaMenu ?? null
    }
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
