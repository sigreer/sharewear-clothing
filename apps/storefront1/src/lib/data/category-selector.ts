"use server"

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

type CategoryRepresentationBase<TType extends string> = {
  type: TType
}

type CustomImageRepresentation = CategoryRepresentationBase<"custom_image"> & {
  custom_image_url: string | null
  placeholder: boolean
}

type ProductImageRepresentation = CategoryRepresentationBase<"product_image"> & {
  product: {
    id: string
    title: string
    handle: string | null
    description: string | null
    thumbnail: string | null
    images: Array<{
      id: string
      url: string | null
      alt_text: string | null
    }>
  } | null
  image: {
    id: string
    url: string | null
    alt_text: string | null
  } | null
}

type RandomPoolRepresentation = CategoryRepresentationBase<"random_pool"> & {
  pool: Array<{
    id: string
    title: string
    handle: string | null
    description: string | null
    thumbnail: string | null
    images: Array<{
      id: string
      url: string | null
      alt_text: string | null
    }>
  }>
}

type CategoryRepresentation =
  | CustomImageRepresentation
  | ProductImageRepresentation
  | RandomPoolRepresentation

export type CategorySelectorPresentation = {
  enabled: boolean
  scale_mode: "fit_width" | "fit_height" | "cover" | "shortest_side" | "longest_side"
  style: "flips" | "edge_to_edge" | "square" | "carousel" | "grid"
  max_rows: number | null
  max_columns: number | null
  randomize_visible_categories: boolean
}

export type CategorySelectorEntry = {
  id: string
  name: string
  handle: string | null
  description: string | null
  mode: "custom_image" | "product_image" | "random_product"
  config_id: string | null
  custom_image_url: string | null
  representation: CategoryRepresentation
  has_configuration: boolean
  issues: string[]
  presentation: CategorySelectorPresentation
}

export type CategorySelectorResponse = {
  generated_at: string
  categories: CategorySelectorEntry[]
  presentation: CategorySelectorPresentation
}

export const listCategorySelectorEntries = async (): Promise<CategorySelectorResponse | null> => {
  try {
    const next = {
      ...(await getCacheOptions("category-selector")),
      revalidate: 300,
    }

    const response = await sdk.client.fetch<CategorySelectorResponse>(
      "/store/category-selector-by-product",
      {
        next,
        cache: "force-cache",
      }
    )

    return response
  } catch (error) {
    console.error("Failed to load category selector entries", error)
    return null
  }
}
