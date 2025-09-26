export type CategoryRepresentationMode =
  | "custom_image"
  | "product_image"
  | "random_product"

export type CategorySelectorScaleMode =
  | "fit_width"
  | "fit_height"
  | "cover"
  | "shortest_side"
  | "longest_side"

export type CategorySelectorStyle =
  | "flips"
  | "edge_to_edge"
  | "square"
  | "carousel"
  | "grid"

export type CategorySelectorPresentationConfig = {
  enabled: boolean
  scale_mode: CategorySelectorScaleMode
  style: CategorySelectorStyle
  max_rows: number | null
  max_columns: number | null
  randomize_visible_categories: boolean
}

export const DEFAULT_CATEGORY_SELECTOR_PRESENTATION: CategorySelectorPresentationConfig = {
  enabled: true,
  scale_mode: "cover",
  style: "grid",
  max_rows: null,
  max_columns: null,
  randomize_visible_categories: false
}

export type CategorySelectorConfigMetadata = {
  presentation?: Partial<CategorySelectorPresentationConfig>
} & Record<string, unknown>

export type CategorySelectorConfigDTO = {
  id: string
  category_id: string
  mode: CategoryRepresentationMode
  custom_image_url?: string | null
  selected_product_id?: string | null
  selected_product_image_id?: string | null
  random_product_ids?: string[] | null
  metadata?: CategorySelectorConfigMetadata | null
  presentation: CategorySelectorPresentationConfig
  created_at?: Date | string | null
  updated_at?: Date | string | null
}

export type CategorySelectorConfigUpsertDTO = {
  category_id: string
  mode: CategoryRepresentationMode
  custom_image_url?: string | null
  selected_product_id?: string | null
  selected_product_image_id?: string | null
  random_product_ids?: string[] | null
  metadata?: CategorySelectorConfigMetadata | null
  presentation?: Partial<CategorySelectorPresentationConfig> | null
}

export type CategorySelectorResolvedImage = {
  image_id: string | null
  url: string | null
  alt_text?: string | null
}

export type CategorySelectorResolvedProduct = {
  id: string
  title: string
  handle?: string | null
  thumbnail?: string | null
  images: CategorySelectorResolvedImage[]
}

export type CategorySelectorResolvedCategory = {
  id: string
  name: string
  handle: string | null
  description: string | null
  mode: CategoryRepresentationMode
  custom_image_url: string | null
  product?: CategorySelectorResolvedProduct | null
  random_pool?: CategorySelectorResolvedProduct[]
  presentation: CategorySelectorPresentationConfig
}
