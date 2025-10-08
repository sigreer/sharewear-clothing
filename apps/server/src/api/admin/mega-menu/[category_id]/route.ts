import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/types"
import {
  MEGA_MENU_MODULE,
  type MegaMenuService,
  type MegaMenuLayout
} from "../../../../modules/mega-menu"
import { pickMegaMenuPayload, validateIconField, validateColumnsIcons } from "../utils"

const AVAILABLE_MENU_LAYOUTS: MegaMenuLayout[] = ["no-menu", "simple-dropdown", "rich-columns"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(Modules.PRODUCT)

  const [config, globalConfig] = await Promise.all([
    megaMenuService.getCategoryConfig(categoryId),
    megaMenuService.getGlobalConfig()
  ])

  // Resolve product image if selectedThumbnailImageId is set
  let resolvedThumbnail: { id: string; url: string | null; alt_text: string | null } | null = null
  let resolvedThumbnailProduct: { id: string; title: string; handle: string | null } | null = null

  if (config?.selectedThumbnailProductId && config?.selectedThumbnailImageId) {
    try {
      const product = await productModuleService.retrieveProduct(
        config.selectedThumbnailProductId,
        {
          select: ["id", "title", "handle"],
          relations: ["images"]
        }
      )

      if (product) {
        resolvedThumbnailProduct = {
          id: product.id,
          title: product.title,
          handle: product.handle ?? null
        }

        const image = product.images?.find(img => img.id === config.selectedThumbnailImageId)
        if (image) {
          resolvedThumbnail = {
            id: image.id,
            url: image.url ?? null,
            alt_text: (image.metadata?.alt as string | undefined) ?? null
          }
        }
      }
    } catch (error) {
      // Product or image not found, continue without resolved thumbnail
    }
  }

  res.json({
    categoryId,
    config,
    inherited: config ? null : globalConfig,
    defaults: megaMenuService.getDefaults(),
    availableMenuLayouts: AVAILABLE_MENU_LAYOUTS,
    resolvedThumbnail,
    resolvedThumbnailProduct
  })
}

/**
 * PUT /admin/mega-menu/:category_id
 *
 * Updates or creates mega-menu configuration for a category.
 *
 * Icon Field: The `icon` field accepts LucideReact icon names (e.g., 'ShoppingBag', 'Heart', 'Star').
 * Icons should follow PascalCase naming convention. See https://lucide.dev/icons for available icons.
 * Invalid icon names will log warnings but won't block the request.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(Modules.PRODUCT)

  const body = pickMegaMenuPayload(req.body)

  // Validate icon fields (logs warnings, doesn't block)
  if (body.icon) {
    validateIconField(body.icon, `category ${categoryId} icon`)
  }
  if (body.columns) {
    validateColumnsIcons(body.columns)
  }

  const updated = await megaMenuService.upsertCategoryConfig({
    ...body,
    categoryId
  })

  // Resolve product image if selectedThumbnailImageId is set
  let resolvedThumbnail: { id: string; url: string | null; alt_text: string | null } | null = null
  let resolvedThumbnailProduct: { id: string; title: string; handle: string | null } | null = null

  if (updated?.selectedThumbnailProductId && updated?.selectedThumbnailImageId) {
    try {
      const product = await productModuleService.retrieveProduct(
        updated.selectedThumbnailProductId,
        {
          select: ["id", "title", "handle"],
          relations: ["images"]
        }
      )

      if (product) {
        resolvedThumbnailProduct = {
          id: product.id,
          title: product.title,
          handle: product.handle ?? null
        }

        const image = product.images?.find(img => img.id === updated.selectedThumbnailImageId)
        if (image) {
          resolvedThumbnail = {
            id: image.id,
            url: image.url ?? null,
            alt_text: (image.metadata?.alt as string | undefined) ?? null
          }
        }
      }
    } catch (error) {
      // Product or image not found, continue without resolved thumbnail
    }
  }

  res.json({
    categoryId,
    config: updated,
    resolvedThumbnail,
    resolvedThumbnailProduct
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
