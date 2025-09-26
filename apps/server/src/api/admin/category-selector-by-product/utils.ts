import {
  CategorySelectorConfigDTO,
  CategoryRepresentationMode
} from "../../../modules/category-selector-by-product"
import { ProductDTO } from "@medusajs/types"

export type FormattedImage = {
  id: string
  url: string | null
  alt_text: string | null
}

export type FormattedProduct = {
  id: string
  title: string
  handle: string | null
  description: string | null
  thumbnail: string | null
  images: FormattedImage[]
}

export const formatProduct = (product: ProductDTO): FormattedProduct => ({
  id: product.id,
  title: product.title,
  handle: product.handle ?? null,
  description: product.description ?? null,
  thumbnail:
    product.thumbnail ??
    product.images?.[0]?.url ??
    (typeof product.metadata?.thumbnail === "string"
      ? (product.metadata.thumbnail as string)
      : null),
  images: (product.images ?? []).map(image => ({
    id: image.id,
    url: image.url ?? null,
    alt_text: (image.metadata?.alt as string | undefined) ?? null
  }))
})

export const collectProductIdsFromConfig = (
  config: CategorySelectorConfigDTO | null | undefined
): string[] => {
  if (!config) {
    return []
  }

  const ids = new Set<string>()

  if (config.selected_product_id) {
    ids.add(config.selected_product_id)
  }

  if (Array.isArray(config.random_product_ids)) {
    for (const productId of config.random_product_ids) {
      if (productId) {
        ids.add(productId)
      }
    }
  }

  return Array.from(ids)
}

export const resolveConfigRepresentation = (
  config: CategorySelectorConfigDTO | null | undefined,
  productMap: Map<string, FormattedProduct>
): {
  resolvedProduct: FormattedProduct | null
  resolvedImage: FormattedImage | null
  resolvedPool: FormattedProduct[]
  mode: CategoryRepresentationMode
} => {
  const mode = config?.mode ?? "random_product"

  if (!config) {
    return {
      mode,
      resolvedProduct: null,
      resolvedImage: null,
      resolvedPool: []
    }
  }

  let resolvedProduct: FormattedProduct | null = null
  let resolvedImage: FormattedImage | null = null
  const resolvedPool: FormattedProduct[] = []

  if (config.selected_product_id) {
    resolvedProduct = productMap.get(config.selected_product_id) ?? null

    if (resolvedProduct && config.selected_product_image_id) {
      resolvedImage =
        resolvedProduct.images.find(
          image => image.id === config.selected_product_image_id
        ) ?? null
    }
  }

  if (Array.isArray(config.random_product_ids)) {
    for (const productId of config.random_product_ids) {
      const product = productMap.get(productId)
      if (product) {
        resolvedPool.push(product)
      }
    }
  }

  return {
    mode: config.mode,
    resolvedProduct,
    resolvedImage,
    resolvedPool
  }
}
