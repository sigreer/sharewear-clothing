import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IProductModuleService, ProductCategoryDTO } from "@medusajs/types"
import {
  CATEGORY_SELECTOR_BY_PRODUCT,
  CategorySelectorByProductService,
  CategorySelectorConfigDTO,
  CategoryRepresentationMode,
  CategorySelectorPresentationConfig,
  DEFAULT_CATEGORY_SELECTOR_PRESENTATION
} from "../../../modules/category-selector-by-product"
import {
  collectProductIdsFromConfig,
  formatProduct,
  FormattedImage,
  FormattedProduct,
  resolveConfigRepresentation
} from "./utils"

type CategorySummary = {
  id: string
  name: string
  handle: string | null
  description: string | null
  parent_category_id: string | null
}

type CategorySelectorAdminResponse = {
  categories: Array<
    CategorySummary & {
      config: CategorySelectorConfigDTO & {
        random_product_ids: string[]
      }
      resolved_product: FormattedProduct | null
      resolved_image: FormattedImage | null
      resolved_pool: FormattedProduct[]
    }
  >
  availableModes: CategoryRepresentationMode[]
  total: number
  presentation: CategorySelectorPresentationConfig
}

const buildDefaultConfig = (
  categoryId: string,
  presentation: CategorySelectorPresentationConfig
): CategorySelectorConfigDTO & { random_product_ids: string[] } => ({
  id: "",
  category_id: categoryId,
  mode: "random_product",
  custom_image_url: null,
  selected_product_id: null,
  selected_product_image_id: null,
  random_product_ids: [],
  metadata: {
    presentation: { ...presentation }
  },
  presentation: { ...presentation },
  created_at: null,
  updated_at: null
})

const sanitizeCategory = (category: ProductCategoryDTO): CategorySummary => ({
  id: category.id,
  name: category.name ?? "Untitled category",
  handle: category.handle ?? null,
  description: category.description ?? null,
  parent_category_id: category.parent_category_id ?? null
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

    collectProductIdsFromConfig(config).forEach(id => productIds.add(id))
  }

  const productMap = new Map<string, FormattedProduct>()

  if (productIds.size) {
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

  const payload: CategorySelectorAdminResponse = {
    categories: baseCategories.map(category => {
      const sanitized = sanitizeCategory(category)
      const config = configMap.get(category.id)

      const resolvedConfig: CategorySelectorConfigDTO & {
        random_product_ids: string[]
      } = config
        ? {
            ...config,
            random_product_ids: config.random_product_ids ?? [],
            presentation: config.presentation ?? {
              ...globalPresentation
            }
          }
        : buildDefaultConfig(category.id, globalPresentation)

      const { resolvedProduct, resolvedImage, resolvedPool } =
        resolveConfigRepresentation(config, productMap)

      return {
        ...sanitized,
        config: resolvedConfig,
        resolved_product: resolvedProduct,
        resolved_image: resolvedImage,
        resolved_pool: resolvedPool
      }
    }),
    availableModes: [
      "custom_image",
      "product_image",
      "random_product"
    ],
    total: baseCategories.length,
    presentation: globalPresentation
  }

  res.json(payload)
}
