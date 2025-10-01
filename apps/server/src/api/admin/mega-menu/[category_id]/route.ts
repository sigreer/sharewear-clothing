import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  MEGA_MENU_MODULE,
  type MegaMenuConfigDTO,
  type MegaMenuService,
  type MegaMenuLayout
} from "../../../../modules/mega-menu"
import { IProductModuleService } from "@medusajs/types"
import {
  collectCategoryIdsFromConfig,
  pickMegaMenuPayload
} from "../utils"

const AVAILABLE_LAYOUTS: MegaMenuLayout[] = ["default", "thumbnail-grid"]

const fetchCategory = async (
  productModuleService: IProductModuleService,
  categoryId: string
) => {
  const categories = await productModuleService.listProductCategories(
    {
      id: [categoryId]
    },
    {
      take: 1,
      select: [
        "id",
        "name",
        "handle",
        "description",
        "parent_category_id",
        "rank"
      ]
    }
  )

  return categories[0] ?? null
}

const loadReferencedCategories = async (
  productModuleService: IProductModuleService,
  config: MegaMenuConfigDTO | null
) => {
  const ids = collectCategoryIdsFromConfig(config)

  if (!ids.length) {
    return []
  }

  return productModuleService.listProductCategories(
    {
      id: ids
    },
    {
      take: ids.length,
      select: [
        "id",
        "name",
        "handle",
        "description",
        "parent_category_id",
        "rank"
      ]
    }
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const category = await fetchCategory(productModuleService, categoryId)

  if (!category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Category ${categoryId} was not found.`
    )
  }

  const [config, globalConfig] = await Promise.all([
    megaMenuService.getCategoryConfig(categoryId),
    megaMenuService.getGlobalConfig()
  ])

  const effectiveConfig = config ?? globalConfig
  const categories = await loadReferencedCategories(
    productModuleService,
    effectiveConfig
  )

  const preview = await megaMenuService.buildPreview(effectiveConfig, categories)

  res.json({
    category: {
      id: category.id,
      name: category.name,
      handle: category.handle,
      description: category.description,
      parent_category_id: category.parent_category_id,
      rank: category.rank
    },
    config,
    inherited: config ? null : globalConfig,
    preview,
    defaults: megaMenuService.getDefaults(),
    availableLayouts: AVAILABLE_LAYOUTS
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const body = pickMegaMenuPayload(req.body)

  const updated = await megaMenuService.upsertCategoryConfig({
    ...body,
    categoryId
  })

  const categories = await loadReferencedCategories(
    productModuleService,
    updated
  )

  const preview = await megaMenuService.buildPreview(updated, categories)

  res.json({
    categoryId,
    config: updated,
    preview
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

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  await megaMenuService.deleteCategoryConfig(categoryId)

  res.status(204).send()
}
