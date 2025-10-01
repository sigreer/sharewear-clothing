import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { InferEntityType, Logger } from "@medusajs/framework/types"
import CategorySelectorByProductConfig from "./models/category-selector-config"
import {
  CategorySelectorConfigDTO,
  CategorySelectorConfigMetadata,
  CategorySelectorConfigUpsertDTO,
  CategorySelectorPresentationConfig,
  CategorySelectorStyle,
  CategoryRepresentationMode,
  CategorySelectorScaleMode,
  DEFAULT_CATEGORY_SELECTOR_PRESENTATION
} from "./types"

export const CATEGORY_SELECTOR_BY_PRODUCT = "category_selector_by_product"
export const CATEGORY_SELECTOR_GLOBAL_ID = "__category_selector_by_product_global__"

type InjectedDependencies = {
  logger: Logger
}

type CategorySelectorConfigEntity = InferEntityType<
  typeof CategorySelectorByProductConfig
>

type NormalizedConfigPayload = Omit<
  CategorySelectorConfigEntity,
  "id" | "created_at" | "updated_at" | "metadata"
> & {
  metadata: CategorySelectorConfigMetadata
}

const ALLOWED_MODES: CategoryRepresentationMode[] = [
  "custom_image",
  "product_image",
  "random_product"
]

const ALLOWED_SCALE_MODES: CategorySelectorScaleMode[] = [
  "fit_width",
  "fit_height",
  "cover",
  "shortest_side",
  "longest_side"
]

const ALLOWED_STYLES: CategorySelectorStyle[] = [
  "flips",
  "edge_to_edge",
  "square",
  "carousel",
  "grid"
]


class CategorySelectorByProductService extends MedusaService({
  CategorySelectorByProductConfig
}) {
  protected readonly logger_: Logger

  constructor(dependencies: InjectedDependencies) {
    super(dependencies)

    this.logger_ = dependencies.logger
  }

  async upsertCategoryConfig(
    data: CategorySelectorConfigUpsertDTO
  ): Promise<CategorySelectorConfigDTO> {
    const payload = this.normalizePayload(data)

    const [existing] = await this.listCategorySelectorByProductConfigs(
      {
        category_id: payload.category_id
      },
      {
        take: 1
      }
    )

    if (existing) {
      const updated = await this.updateCategorySelectorByProductConfigs({
        id: existing.id,
        ...payload
      })

      return this.toDTO(updated)
    }

    const created = await this.createCategorySelectorByProductConfigs({
      ...payload
    })

    return this.toDTO(created)
  }

  async deleteCategoryConfig(categoryId: string): Promise<void> {
    const [existing] = await this.listCategorySelectorByProductConfigs(
      {
        category_id: categoryId
      },
      {
        take: 1
      }
    )

    if (!existing) {
      return
    }

    await this.deleteCategorySelectorByProductConfigs(existing.id)
  }

  async getCategoryConfig(
    categoryId: string
  ): Promise<CategorySelectorConfigDTO | null> {
    const [existing] = await this.listCategorySelectorByProductConfigs(
      {
        category_id: categoryId
      },
      {
        take: 1
      }
    )

    return existing ? this.toDTO(existing) : null
  }

  async getCategoryConfigMap(
    categoryIds: string[]
  ): Promise<Map<string, CategorySelectorConfigDTO>> {
    if (!categoryIds.length) {
      return new Map()
    }

    const configs = await this.listCategorySelectorByProductConfigs({
      category_id: categoryIds
    })

    return configs.reduce<Map<string, CategorySelectorConfigDTO>>(
      (acc, config) => {
        acc.set(config.category_id, this.toDTO(config))
        return acc
      },
      new Map()
    )
  }

  protected normalizePayload(
    data: CategorySelectorConfigUpsertDTO
  ): NormalizedConfigPayload {
    const categoryId = data.category_id?.trim()

    if (!categoryId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Category ID is required when updating category selector configuration."
      )
    }

    if (!ALLOWED_MODES.includes(data.mode)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported representation mode "${data.mode}".`
      )
    }

    const metadata = this.ensureMetadataShape(
      data.metadata,
      data.presentation
    )

    const base: NormalizedConfigPayload = {
      category_id: categoryId,
      mode: data.mode,
      custom_image_url: null,
      selected_product_id: null,
      selected_product_image_id: null,
      random_product_ids: null,
      deleted_at: null,
      metadata
    }

    if (data.mode === "product_image") {
      if (!data.selected_product_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "A product must be selected when using the product image mode."
        )
      }

      if (!data.selected_product_image_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "An image must be chosen when using the product image mode."
        )
      }

      base.selected_product_id = data.selected_product_id
      base.selected_product_image_id = data.selected_product_image_id
    }

    if (data.mode === "random_product") {
      const pool = Array.from(
        new Set((data.random_product_ids ?? []).filter(Boolean))
      )

      if (!pool.length) {
        this.logger_.warn(
          `category-selector-by-product: random pool for category ${categoryId} is empty. The storefront will not have products to choose from.`
        )
      }

      base.random_product_ids = pool as any
    }

    if (data.mode === "custom_image") {
      base.custom_image_url = data.custom_image_url ?? null
    }

    return base
  }

  protected toDTO(
    entity: CategorySelectorConfigEntity
  ): CategorySelectorConfigDTO {
    const metadata = this.ensureMetadataShape(entity.metadata)

    return {
      id: entity.id,
      category_id: entity.category_id,
      mode: entity.mode as CategoryRepresentationMode,
      custom_image_url: entity.custom_image_url ?? null,
      selected_product_id: entity.selected_product_id ?? null,
      selected_product_image_id: entity.selected_product_image_id ?? null,
      random_product_ids: Array.isArray(entity.random_product_ids)
        ? (entity.random_product_ids as string[])
        : null,
      metadata,
      presentation: metadata.presentation ?? {} as any,
      created_at: entity.created_at ?? null,
      updated_at: entity.updated_at ?? null
    }
  }

  protected ensureMetadataShape(
    rawMetadata: unknown,
    presentationOverride?: Partial<CategorySelectorPresentationConfig> | null
  ): CategorySelectorConfigMetadata {
    const metadata: Record<string, unknown> =
      rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
        ? { ...(rawMetadata as Record<string, unknown>) }
        : {}

    const existingPresentation = this.extractPresentationDraft(metadata)

    const normalizedPresentation = this.normalizePresentationConfig(
      presentationOverride ?? existingPresentation ?? undefined
    )

    return {
      ...metadata,
      presentation: normalizedPresentation
    } as CategorySelectorConfigMetadata
  }

  protected normalizePresentationConfig(
    draft?: Partial<CategorySelectorPresentationConfig> | null
  ): CategorySelectorPresentationConfig {
    const normalized: CategorySelectorPresentationConfig = {
      ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION
    }

    if (draft) {
      if (typeof draft.enabled === "boolean") {
        normalized.enabled = draft.enabled
      }

      if (draft.scale_mode && ALLOWED_SCALE_MODES.includes(draft.scale_mode)) {
        normalized.scale_mode = draft.scale_mode
      }

      if (draft.style && ALLOWED_STYLES.includes(draft.style)) {
        normalized.style = draft.style
      }

      if (draft.max_rows !== undefined) {
        normalized.max_rows = this.normalizeDimension(draft.max_rows)
      }

      if (draft.max_columns !== undefined) {
        normalized.max_columns = this.normalizeDimension(draft.max_columns)
      }

      if (typeof draft.randomize_visible_categories === "boolean") {
        normalized.randomize_visible_categories =
          draft.randomize_visible_categories
      }
    }

    return normalized
  }

  protected normalizeDimension(value: unknown): number | null {
    if (typeof value === "number") {
      const sanitized = Math.max(0, Math.floor(value))
      return sanitized === 0 ? null : sanitized
    }

    if (typeof value === "string" && value.trim().length) {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isNaN(parsed)) {
        const sanitized = Math.max(0, parsed)
        return sanitized === 0 ? null : sanitized
      }
    }

    return null
  }

  protected extractPresentationDraft(
    metadata: Record<string, unknown>
  ): Partial<CategorySelectorPresentationConfig> | undefined {
    const value = (metadata as CategorySelectorConfigMetadata).presentation

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined
    }

    return value as Partial<CategorySelectorPresentationConfig>
  }

  async getGlobalPresentation(): Promise<CategorySelectorPresentationConfig> {
    const config = await this.getCategoryConfig(CATEGORY_SELECTOR_GLOBAL_ID)

    if (config?.presentation) {
      return {
        ...config.presentation
      }
    }

    return {
      ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION
    }
  }

  async updateGlobalPresentation(
    presentation: Partial<CategorySelectorPresentationConfig> | null | undefined
  ): Promise<CategorySelectorPresentationConfig> {
    const normalized = this.normalizePresentationConfig(presentation ?? undefined)

    await this.upsertCategoryConfig({
      category_id: CATEGORY_SELECTOR_GLOBAL_ID,
      mode: "random_product",
      presentation: normalized,
      metadata: {
        presentation: normalized
      }
    })

    const configs = await this.listCategorySelectorByProductConfigs({})

    const updates = configs.filter(config => config.category_id !== CATEGORY_SELECTOR_GLOBAL_ID)

    if (updates.length) {
      await Promise.all(
        updates.map(config =>
          this.updateCategorySelectorByProductConfigs({
            id: config.id,
            metadata: this.ensureMetadataShape(config.metadata, normalized)
          })
        )
      )
    }

    return normalized
  }
}

export default CategorySelectorByProductService
