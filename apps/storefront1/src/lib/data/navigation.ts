import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export interface NavigationItem {
  id: string
  label: string
  href: string
  subLabel?: string
  children: NavigationItem[]
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
      return response.items
    })
    .catch((error) => {
      console.error("Navigation API error:", error)
      return []
    })
}
