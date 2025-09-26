import { ProductCategoryDTO } from "@medusajs/types"

export interface DynamicCategoryMenuItem {
  id: string
  label: string
  href: string
  subLabel?: string
  children: DynamicCategoryMenuItem[]
}

export interface DynamicCategoryMenuOptions {
  /**
   * Base href used when constructing links. Handle or id is appended.
   * Defaults to `/store?category=`.
   */
  baseHref?: string
  /**
   * Whether internal categories should be included. Defaults to `false`.
   */
  includeInternal?: boolean
  /**
   * Whether inactive categories should be included. Defaults to `false`.
   */
  includeInactive?: boolean
  /**
   * If no handle is present, fall back to using the category id when building links. Defaults to `true`.
   */
  fallbackToId?: boolean
  /**
   * Prefix used to generate a readable label when name and handle are missing.
   * Example: `fallbackPrefix` = "Browse" => "Browse ABC".
   */
  fallbackPrefix?: string
  /**
   * Maximum depth of the generated tree. `null` or `undefined` will include every level.
   */
  maxDepth?: number | null
  /**
   * Optional function to transform the Medusa category before it is converted into a navigation item.
   */
  transformCategory?: (category: ProductCategoryDTO) => Partial<DynamicCategoryMenuItem>
}
