import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  CATEGORY_SELECTOR_BY_PRODUCT,
  CategorySelectorByProductService,
  CategorySelectorConfigDTO,
  CategorySelectorConfigUpsertDTO
} from "../../../../modules/category-selector-by-product"
import { IProductModuleService } from "@medusajs/types"
import {
  collectProductIdsFromConfig,
  formatProduct,
  FormattedImage,
  FormattedProduct,
  resolveConfigRepresentation
} from "../utils"

type CategorySelectorDetailResponse = {
  category_id: string
  config: CategorySelectorConfigDTO & { random_product_ids: string[] }
  resolved_product: FormattedProduct | null
  resolved_image: FormattedImage | null
  resolved_pool: FormattedProduct[]
  has_configuration: boolean
}

const parseBody = (body: any): Partial<CategorySelectorConfigUpsertDTO> => {
  if (!body || typeof body !== "object") {
    return {}
  }

  const {
    mode,
    custom_image_url,
    selected_product_id,
    selected_product_image_id,
    random_product_ids,
    metadata,
    presentation
  } = body

  return {
    mode,
    custom_image_url,
    selected_product_id,
    selected_product_image_id,
    random_product_ids,
    metadata,
    presentation
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const selectorService =
    req.scope.resolve<CategorySelectorByProductService>(
      CATEGORY_SELECTOR_BY_PRODUCT
    )

  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const [config, globalPresentation] = await Promise.all([
    selectorService.getCategoryConfig(categoryId),
    selectorService.getGlobalPresentation()
  ])

  const preparedConfig: CategorySelectorDetailResponse["config"] = config
    ? {
        ...config,
        random_product_ids: config.random_product_ids ?? [],
        presentation: config.presentation ?? {
          ...globalPresentation
        }
      }
    : {
        id: "",
        category_id: categoryId,
        mode: "random_product",
        custom_image_url: null,
        selected_product_id: null,
        selected_product_image_id: null,
        random_product_ids: [],
        metadata: {
          presentation: {
            ...globalPresentation
          }
        },
        presentation: {
          ...globalPresentation
        },
        created_at: null,
        updated_at: null
      }

  const productMap = new Map<string, FormattedProduct>()
  const productIds = collectProductIdsFromConfig(config)

  if (productIds.length) {
    const products = await productModuleService.listProducts(
      {
        id: productIds
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
        take: Math.max(productIds.length, 10)
      }
    )

    for (const product of products) {
      productMap.set(product.id, formatProduct(product))
    }
  }

  const { resolvedProduct, resolvedImage, resolvedPool } =
    resolveConfigRepresentation(config ?? null, productMap)

  const payload: CategorySelectorDetailResponse = {
    category_id: categoryId,
    config: preparedConfig,
    resolved_product: resolvedProduct,
    resolved_image: resolvedImage,
    resolved_pool: resolvedPool,
    has_configuration: Boolean(config)
  }

  res.json(payload)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const selectorService =
    req.scope.resolve<CategorySelectorByProductService>(
      CATEGORY_SELECTOR_BY_PRODUCT
    )
  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const payload = parseBody(req.body)

  if (!payload.mode) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The representation mode is required."
    )
  }

  const updated = await selectorService.upsertCategoryConfig({
    category_id: categoryId,
    mode: payload.mode,
    custom_image_url: payload.custom_image_url,
    selected_product_id: payload.selected_product_id,
    selected_product_image_id: payload.selected_product_image_id,
    random_product_ids: payload.random_product_ids,
    metadata: payload.metadata as Record<string, unknown> | undefined,
    presentation: payload.presentation
  })

  const productMap = new Map<string, FormattedProduct>()
  const productIds = collectProductIdsFromConfig(updated)

  if (productIds.length) {
    const products = await productModuleService.listProducts(
      {
        id: productIds
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
        take: Math.max(productIds.length, 10)
      }
    )

    for (const product of products) {
      productMap.set(product.id, formatProduct(product))
    }
  }

  const { resolvedProduct, resolvedImage, resolvedPool } =
    resolveConfigRepresentation(updated, productMap)

  res.json({
    category_id: categoryId,
    config: {
      ...updated,
      random_product_ids: updated.random_product_ids ?? []
    },
    resolved_product: resolvedProduct,
    resolved_image: resolvedImage,
    resolved_pool: resolvedPool
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const selectorService =
    req.scope.resolve<CategorySelectorByProductService>(
      CATEGORY_SELECTOR_BY_PRODUCT
    )

  await selectorService.deleteCategoryConfig(categoryId)

  res.status(204).send()
}
