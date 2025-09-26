import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  IProductModuleService,
  ProductCategoryDTO,
  ProductDTO
} from "@medusajs/types"
import {
  CATEGORY_SELECTOR_BY_PRODUCT,
  CategorySelectorByProductService,
  CategoryRepresentationMode,
  CategorySelectorPresentationConfig,
  DEFAULT_CATEGORY_SELECTOR_PRESENTATION
} from "../../../modules/category-selector-by-product"

type FormattedImage = {
  id: string
  url: string | null
  alt_text: string | null
}

type FormattedProduct = {
  id: string
  title: string
  handle: string | null
  description: string | null
  thumbnail: string | null
  images: FormattedImage[]
}

type StoreCategorySelectorEntry = {
  id: string
  name: string
  handle: string | null
  description: string | null
  mode: CategoryRepresentationMode
  config_id: string | null
  updated_at: string | null
  custom_image_url: string | null
  representation:
    | {
        type: "custom_image"
        placeholder: boolean
        custom_image_url: string | null
      }
    | {
        type: "product_image"
        product: FormattedProduct | null
        image: FormattedImage | null
      }
    | {
        type: "random_pool"
        pool: FormattedProduct[]
      }
  has_configuration: boolean
  issues: string[]
  presentation: CategorySelectorPresentationConfig
}

type StoreCategorySelectorResponse = {
  generated_at: string
  categories: StoreCategorySelectorEntry[]
  presentation: CategorySelectorPresentationConfig
}

const formatCategory = (category: ProductCategoryDTO) => ({
  id: category.id,
  name: category.name ?? "Untitled category",
  handle: category.handle ?? null,
  description: category.description ?? null
})

const formatProduct = (product: ProductDTO): FormattedProduct => ({
  id: product.id,
  title: product.title,
  handle: product.handle ?? null,
  description: product.description ?? null,
  thumbnail:
    product.thumbnail ?? product.images?.[0]?.url ?? product.metadata?.thumbnail ?? null,
  images: (product.images ?? []).map(image => ({
    id: image.id,
    url: image.url ?? null,
    alt_text: (image.metadata?.alt as string | undefined) ?? null
  }))
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const selectorService =
    req.scope.resolve<CategorySelectorByProductService>(
      CATEGORY_SELECTOR_BY_PRODUCT
    )

  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const categories = await productModuleService.listProductCategories(
    {},
    {
      select: [
        "id",
        "name",
        "handle",
        "description",
        "parent_category_id"
      ],
      take: 1000
    }
  )

  const baseCategories = categories.filter(
    category => !category.parent_category_id
  )

  const configMap = await selectorService.getCategoryConfigMap(
    baseCategories.map(category => category.id)
  )

  const productIds = new Set<string>()

  for (const category of baseCategories) {
    const config = configMap.get(category.id)

    if (!config) {
      continue
    }

    if (config.mode === "product_image" && config.selected_product_id) {
      productIds.add(config.selected_product_id)
    }

    if (config.mode === "random_product") {
      const pool = Array.isArray(config.random_product_ids)
        ? config.random_product_ids
        : []
      for (const productId of pool) {
        productIds.add(productId)
      }
    }
  }

  const productMap = new Map<string, FormattedProduct>()

  if (productIds.size > 0) {
    const products = await productModuleService.listProducts(
      {
        id: Array.from(productIds)
      },
      {
        relations: ["images"],
        select: [
          "id",
          "title",
          "handle",
          "description",
          "thumbnail",
          "metadata"
        ],
        take: Math.max(productIds.size, 50)
      }
    )

    for (const product of products) {
      productMap.set(product.id, formatProduct(product))
    }
  }

  const globalPresentation = await selectorService.getGlobalPresentation()

  const payload: StoreCategorySelectorResponse = {
    generated_at: new Date().toISOString(),
    categories: baseCategories.map(category => {
      const base = formatCategory(category)
      const config = configMap.get(category.id)
      const issues: string[] = []

      if (!config) {
        return {
          ...base,
          mode: "random_product" as CategoryRepresentationMode,
          config_id: null,
          updated_at: null,
          custom_image_url: null,
          representation: {
            type: "random_pool" as const,
            pool: []
          },
          has_configuration: false,
          issues,
          presentation: {
            ...globalPresentation
          }
        }
      }

      const mode = config.mode as CategoryRepresentationMode
      let representation: StoreCategorySelectorEntry["representation"]

      if (mode === "custom_image") {
        representation = {
          type: "custom_image",
          placeholder: !config.custom_image_url,
          custom_image_url: config.custom_image_url ?? null
        }
      } else if (mode === "product_image") {
        const product = config.selected_product_id
          ? productMap.get(config.selected_product_id) ?? null
          : null

        if (!product) {
          issues.push(
            `Configured product ${config.selected_product_id ?? "unknown"} is missing or unpublished.`
          )
        }

        const image = product?.images.find(
          entry => entry.id === config.selected_product_image_id
        ) ?? null

        if (!image) {
          issues.push(
            `Image ${config.selected_product_image_id ?? "unknown"} could not be resolved for product ${config.selected_product_id ?? "unknown"}.`
          )
        }

        representation = {
          type: "product_image",
          product: product ?? null,
          image
        }
      } else {
        const poolIds = Array.isArray(config.random_product_ids)
          ? config.random_product_ids
          : []

        const pool = poolIds
          .map(productId => {
            const product = productMap.get(productId)
            if (!product) {
              issues.push(
                `Product ${productId} is no longer available for random pool rotation.`
              )
            }
            return product ?? null
          })
          .filter((product): product is FormattedProduct => Boolean(product))

        representation = {
          type: "random_pool",
          pool
        }
      }

      return {
        ...base,
        mode,
        config_id: config.id,
        updated_at: config.updated_at
          ? new Date(config.updated_at).toISOString()
          : null,
        custom_image_url: config.custom_image_url ?? null,
        representation,
        has_configuration: true,
        issues,
        presentation: {
          ...(config.presentation ?? globalPresentation)
        }
      }
    }),
    presentation: globalPresentation
  }

  res.json(payload)
}
