import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import type { InferEntityType, Logger } from "@medusajs/framework/types"
import type { ProductCategoryDTO } from "@medusajs/types"
import MegaMenuConfig from "./models/mega-menu-config"
import {
  MEGA_MENU_GLOBAL_ID,
  type MegaMenuColumn,
  type MegaMenuColumnConfig,
  type MegaMenuConfigDTO,
  type MegaMenuConfigInput,
  type MegaMenuContent,
  type MegaMenuFeaturedCard,
  type MegaMenuFeaturedCardConfig,
  type MegaMenuLayout,
  type MegaMenuLink,
  type MegaMenuLinkConfig,
  type MegaMenuModuleOptions,
  type MegaMenuNavigationItem
} from "./types"
import type { DynamicCategoryMenuItem } from "../dynamic-category-menu"

const DEFAULT_BASE_HREF = "/store?category="
const AUTO_ITEMS_CHUNK_SIZE = 3

const LAYOUTS: MegaMenuLayout[] = ["default", "thumbnail-grid"]

const isMegaMenuLayout = (value: unknown): value is MegaMenuLayout =>
  typeof value === "string" && LAYOUTS.includes(value as MegaMenuLayout)

type InjectedDependencies = {
  logger: Logger
}

type MegaMenuConfigEntity = InferEntityType<typeof MegaMenuConfig>

type NormalizedOptions = {
  baseHref: string
  defaultLayout: MegaMenuLayout
  defaultTagline: string | null
}

const normalizeString = (value?: string | null): string => {
  if (typeof value !== "string") {
    return ""
  }

  const trimmed = value.trim()
  return trimmed
}

const normalizeNullableString = (value?: string | null): string | null => {
  const normalized = normalizeString(value)
  return normalized.length ? normalized : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value)

export default class MegaMenuService extends MedusaService({
  MegaMenuConfig
}) {
  protected readonly logger_: Logger
  protected readonly options_: NormalizedOptions

  constructor(
    dependencies: InjectedDependencies,
    options: MegaMenuModuleOptions = {}
  ) {
    super(dependencies)

    this.logger_ = dependencies.logger
    this.options_ = {
      baseHref: normalizeString(options.baseHref) || DEFAULT_BASE_HREF,
      defaultLayout: isMegaMenuLayout(options.defaultLayout)
        ? options.defaultLayout
        : "default",
      defaultTagline: normalizeNullableString(options.defaultTagline)
    }
  }

  async upsertCategoryConfig(
    data: MegaMenuConfigInput
  ): Promise<MegaMenuConfigDTO> {
    if (!normalizeString(data.categoryId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Category ID is required when updating Mega Menu configuration."
      )
    }

    return this.upsertConfigInternal(data)
  }

  async upsertGlobalConfig(
    data: Omit<MegaMenuConfigInput, "categoryId"> & { categoryId?: string }
  ): Promise<MegaMenuConfigDTO> {
    return this.upsertConfigInternal({
      ...data,
      categoryId: MEGA_MENU_GLOBAL_ID
    })
  }

  async deleteCategoryConfig(categoryId: string): Promise<void> {
    const normalizedId = normalizeString(categoryId)

    if (!normalizedId) {
      return
    }

    const [existing] = await this.listMegaMenuConfigs(
      { category_id: normalizedId },
      { take: 1 }
    )

    if (!existing) {
      return
    }

    await this.deleteMegaMenuConfigs(existing.id)
  }

  async getCategoryConfig(categoryId: string): Promise<MegaMenuConfigDTO | null> {
    const normalizedId = normalizeString(categoryId)

    if (!normalizedId) {
      return null
    }

    const [existing] = await this.listMegaMenuConfigs(
      { category_id: normalizedId },
      { take: 1 }
    )

    return existing ? this.toDTO(existing) : null
  }

  async getGlobalConfig(): Promise<MegaMenuConfigDTO | null> {
    const [existing] = await this.listMegaMenuConfigs(
      { category_id: MEGA_MENU_GLOBAL_ID },
      { take: 1 }
    )

    return existing ? this.toDTO(existing) : null
  }

  async getConfigMap(
    categoryIds: string[]
  ): Promise<Map<string, MegaMenuConfigDTO>> {
    if (!categoryIds.length) {
      return new Map()
    }

    const normalizedIds = Array.from(
      new Set(
        categoryIds
          .map(id => normalizeString(id))
          .filter((value): value is string => value.length > 0)
      )
    )

    if (!normalizedIds.length) {
      return new Map()
    }

    const configs = await this.listMegaMenuConfigs({
      category_id: normalizedIds
    })

    return configs.reduce<Map<string, MegaMenuConfigDTO>>((acc, config) => {
      acc.set(config.category_id, this.toDTO(config))
      return acc
    }, new Map())
  }

  async buildNavigationWithMegaMenu(
    navigation: DynamicCategoryMenuItem[],
    categories: ProductCategoryDTO[]
  ): Promise<MegaMenuNavigationItem[]> {
    const categoryMap = new Map<string, ProductCategoryDTO>()
    for (const category of categories) {
      if (category?.id) {
        categoryMap.set(category.id, category)
      }
    }

    const categoryIds = [...categoryMap.keys()]
    const configMap = await this.getConfigMap(categoryIds)
    const globalConfig = await this.getGlobalConfig()

    const apply = (
      items: DynamicCategoryMenuItem[]
    ): MegaMenuNavigationItem[] => {
      return items.map(item => {
        const megaMenu = this.resolveMegaMenuContent(
          item.id,
          configMap,
          globalConfig,
          categoryMap
        )

        return {
          ...item,
          children: apply(item.children ?? []),
          megaMenu
        }
      })
    }

    return apply(navigation)
  }

  protected resolveMegaMenuContent(
    categoryId: string,
    configMap: Map<string, MegaMenuConfigDTO>,
    globalConfig: MegaMenuConfigDTO | null,
    categoryMap: Map<string, ProductCategoryDTO>
  ): MegaMenuContent | null {
    const config = configMap.get(categoryId) ?? globalConfig

    if (!config) {
      return null
    }

    return this.buildMegaMenuContent(config, categoryMap)
  }

  protected buildMegaMenuContent(
    config: MegaMenuConfigDTO,
    categoryMap: Map<string, ProductCategoryDTO>
  ): MegaMenuContent | null {
    const layout = config.layout || this.options_.defaultLayout
    const tagline = normalizeNullableString(config.tagline) ?? this.options_.defaultTagline

    const manualColumns = this.buildManualColumns(config.columns, categoryMap)
    const autoItems = this.buildAutomaticItems(config.submenuCategoryIds, categoryMap)

    let columns: MegaMenuColumn[] = manualColumns

    if (!columns.length && autoItems.length) {
      columns = this.buildAutomaticColumns(autoItems, layout, config.metadata)
    }

    const featured = this.buildFeatured(config.featured)

    if (!columns.length && !featured.length && !tagline) {
      return null
    }

    return {
      layout,
      tagline,
      columns,
      featured: featured.length ? featured : undefined
    }
  }

  protected buildManualColumns(
    columns: MegaMenuColumnConfig[] | undefined,
    categoryMap: Map<string, ProductCategoryDTO>
  ): MegaMenuColumn[] {
    if (!Array.isArray(columns)) {
      return []
    }

    return columns
      .map(column => {
        const heading = normalizeNullableString(column?.heading)
        const description = normalizeNullableString(column?.description)
        const imageUrl = normalizeNullableString(column?.imageUrl) ?? undefined
        const items = this.buildLinks(column?.items, categoryMap)

        if (!items.length && !imageUrl) {
          return null
        }

        return {
          heading: heading ?? undefined,
          description: description ?? undefined,
          imageUrl,
          items
        }
      })
      .filter((column): column is MegaMenuColumn => Boolean(column && column.items.length))
  }

  protected buildFeatured(
    featured: MegaMenuFeaturedCardConfig[] | undefined
  ): MegaMenuFeaturedCard[] {
    if (!Array.isArray(featured)) {
      return []
    }

    return featured
      .map(card => {
        const label = normalizeNullableString(card?.label)
        const href = normalizeNullableString(card?.href)

        if (!label || !href) {
          return null
        }

        return {
          eyebrow: normalizeNullableString(card?.eyebrow) ?? undefined,
          label,
          href,
          description: normalizeNullableString(card?.description) ?? undefined,
          ctaLabel: normalizeNullableString(card?.ctaLabel) ?? undefined,
          imageUrl: normalizeNullableString(card?.imageUrl) ?? undefined
        }
      })
      .filter((card): card is MegaMenuFeaturedCard => Boolean(card))
  }

  protected buildAutomaticItems(
    categoryIds: string[] | undefined,
    categoryMap: Map<string, ProductCategoryDTO>
  ): MegaMenuLink[] {
    if (!Array.isArray(categoryIds)) {
      return []
    }

    const seen = new Set<string>()

    const items: MegaMenuLink[] = []

    for (const rawId of categoryIds) {
      const categoryId = normalizeString(rawId)

      if (!categoryId || seen.has(categoryId)) {
        continue
      }

      seen.add(categoryId)

      const category = categoryMap.get(categoryId)

      if (!category) {
        continue
      }

      const label = this.resolveCategoryLabel(category)
      const href = this.resolveCategoryHref(category)

      if (!label || !href) {
        continue
      }

      items.push({
        label,
        href,
        description: normalizeNullableString(category.description) ?? undefined
      })
    }

    return items
  }

  protected buildAutomaticColumns(
    items: MegaMenuLink[],
    layout: MegaMenuLayout,
    metadata: Record<string, unknown> | null
  ): MegaMenuColumn[] {
    if (!items.length) {
      return []
    }

    const headingCandidate = normalizeNullableString(
      isRecord(metadata) ? (metadata.autoHeading as string | undefined) : undefined
    )

    if (layout === "thumbnail-grid") {
      const columns: MegaMenuColumn[] = []

      for (let index = 0; index < items.length; index += AUTO_ITEMS_CHUNK_SIZE) {
        const chunk = items.slice(index, index + AUTO_ITEMS_CHUNK_SIZE)
        columns.push({
          heading: headingCandidate ?? undefined,
          items: chunk
        })
      }

      return columns
    }

    return [
      {
        heading: headingCandidate ?? undefined,
        items
      }
    ]
  }

  protected buildLinks(
    items: MegaMenuLinkConfig[] | null | undefined,
    categoryMap: Map<string, ProductCategoryDTO>
  ): MegaMenuLink[] {
    if (!Array.isArray(items)) {
      return []
    }

    return items
      .map(item => this.transformLink(item, categoryMap))
      .filter((link): link is MegaMenuLink => Boolean(link))
  }

  protected transformLink(
    item: MegaMenuLinkConfig | null | undefined,
    categoryMap: Map<string, ProductCategoryDTO>
  ): MegaMenuLink | null {
    if (!item) {
      return null
    }

    const categoryId = normalizeString(item.categoryId)

    if (categoryId) {
      const category = categoryMap.get(categoryId)

      if (!category) {
        return null
      }

      const label = normalizeNullableString(item.label)
        ?? this.resolveCategoryLabel(category)
      const href = normalizeNullableString(item.href)
        ?? this.resolveCategoryHref(category)

      if (!label || !href) {
        return null
      }

      const description = normalizeNullableString(item.description)
        ?? normalizeNullableString(category.description)

      return {
        label,
        href,
        description: description ?? undefined,
        badge: normalizeNullableString(item.badge) ?? undefined,
        icon: normalizeNullableString(item.icon) ?? undefined,
        thumbnailUrl: normalizeNullableString(item.thumbnailUrl) ?? undefined
      }
    }

    const label = normalizeNullableString(item.label)
    const href = normalizeNullableString(item.href)

    if (!label || !href) {
      return null
    }

    return {
      label,
      href,
      description: normalizeNullableString(item.description) ?? undefined,
      badge: normalizeNullableString(item.badge) ?? undefined,
      icon: normalizeNullableString(item.icon) ?? undefined,
      thumbnailUrl: normalizeNullableString(item.thumbnailUrl) ?? undefined
    }
  }

  protected resolveCategoryLabel(category: ProductCategoryDTO): string {
    const name = normalizeString(category.name as string | undefined)
    const handle = normalizeString(category.handle as string | undefined)

    if (name.length) {
      return name
    }

    if (handle.length) {
      return handle
    }

    return category.id
  }

  protected resolveCategoryHref(category: ProductCategoryDTO): string | null {
    const handle = normalizeString(category.handle as string | undefined)
    const identifier = handle.length ? handle : category.id

    if (!identifier) {
      return null
    }

    return `${this.options_.baseHref}${encodeURIComponent(identifier)}`
  }

  protected upsertConfigInternal(
    data: MegaMenuConfigInput
  ): Promise<MegaMenuConfigDTO> {
    const payload = this.normalizePayload(data)

    return this.listMegaMenuConfigs(
      {
        category_id: payload.category_id
      },
      {
        take: 1
      }
    ).then(async existing => {
      if (existing.length) {
        const updated = await this.updateMegaMenuConfigs({
          id: existing[0].id,
          ...payload
        })
        return this.toDTO(updated)
      }

      const created = await this.createMegaMenuConfigs(payload)
      return this.toDTO(created)
    })
  }

  protected normalizePayload(
    data: MegaMenuConfigInput
  ): Omit<MegaMenuConfigEntity, "id" | "created_at" | "updated_at"> {
    const categoryId = normalizeString(data.categoryId)

    if (!categoryId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Category ID is required when persisting Mega Menu configuration."
      )
    }

    const layout: MegaMenuLayout = isMegaMenuLayout(data.layout)
      ? data.layout!
      : this.options_.defaultLayout

    return {
      category_id: categoryId,
      layout,
      tagline: normalizeNullableString(data.tagline),
      columns: this.normalizeColumns(data.columns),
      featured: this.normalizeFeatured(data.featured),
      submenu_category_ids: this.normalizeSubmenuCategoryIds(
        data.submenuCategoryIds
      ),
      metadata: this.normalizeMetadata(data.metadata)
    }
  }

  protected normalizeColumns(
    columns: MegaMenuColumnConfig[] | null | undefined
  ): MegaMenuColumnConfig[] {
    if (!Array.isArray(columns)) {
      return []
    }

    return columns.map(column => ({
      heading: normalizeNullableString(column?.heading),
      description: normalizeNullableString(column?.description),
      imageUrl: normalizeNullableString(column?.imageUrl),
      items: this.normalizeLinkConfigs(column?.items)
    }))
  }

  protected normalizeLinkConfigs(
    items: MegaMenuLinkConfig[] | null | undefined
  ): MegaMenuLinkConfig[] {
    if (!Array.isArray(items)) {
      return []
    }

    return items.map(item => ({
      label: normalizeNullableString(item?.label),
      href: normalizeNullableString(item?.href),
      description: normalizeNullableString(item?.description),
      badge: normalizeNullableString(item?.badge),
      icon: normalizeNullableString(item?.icon),
      thumbnailUrl: normalizeNullableString(item?.thumbnailUrl),
      categoryId: normalizeNullableString(item?.categoryId),
      metadata: isRecord(item?.metadata) ? (item?.metadata as Record<string, unknown>) : null
    }))
  }

  protected normalizeFeatured(
    featured: MegaMenuFeaturedCardConfig[] | null | undefined
  ): MegaMenuFeaturedCardConfig[] {
    if (!Array.isArray(featured)) {
      return []
    }

    return featured.map(card => ({
      eyebrow: normalizeNullableString(card?.eyebrow),
      label: normalizeNullableString(card?.label),
      href: normalizeNullableString(card?.href),
      description: normalizeNullableString(card?.description),
      ctaLabel: normalizeNullableString(card?.ctaLabel),
      imageUrl: normalizeNullableString(card?.imageUrl),
      metadata: isRecord(card?.metadata)
        ? (card?.metadata as Record<string, unknown>)
        : null
    }))
  }

  protected normalizeSubmenuCategoryIds(
    ids: string[] | null | undefined
  ): string[] {
    if (!Array.isArray(ids)) {
      return []
    }

    const deduped = new Set<string>()

    for (const raw of ids) {
      const normalized = normalizeString(raw)
      if (normalized.length) {
        deduped.add(normalized)
      }
    }

    return [...deduped]
  }

  protected normalizeMetadata(
    metadata: Record<string, unknown> | null | undefined
  ): Record<string, unknown> | null {
    if (!isRecord(metadata)) {
      return null
    }

    return metadata
  }

  protected toDTO(entity: MegaMenuConfigEntity): MegaMenuConfigDTO {
    return {
      id: entity.id,
      categoryId: entity.category_id,
      layout: isMegaMenuLayout(entity.layout)
        ? entity.layout
        : this.options_.defaultLayout,
      tagline: normalizeNullableString(entity.tagline),
      columns: Array.isArray(entity.columns)
        ? (entity.columns as MegaMenuColumnConfig[])
        : [],
      featured: Array.isArray(entity.featured)
        ? (entity.featured as MegaMenuFeaturedCardConfig[])
        : [],
      submenuCategoryIds: Array.isArray(entity.submenu_category_ids)
        ? (entity.submenu_category_ids as string[])
        : [],
      metadata: isRecord(entity.metadata)
        ? (entity.metadata as Record<string, unknown>)
        : null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at
    }
  }

  getDefaults(): { layout: MegaMenuLayout; tagline: string | null; baseHref: string } {
    return {
      layout: this.options_.defaultLayout,
      tagline: this.options_.defaultTagline ?? null,
      baseHref: this.options_.baseHref
    }
  }

  buildPreview(
    config: MegaMenuConfigDTO | null,
    categories: ProductCategoryDTO[]
  ): MegaMenuContent | null {
    if (!config) {
      return null
    }

    const map = new Map<string, ProductCategoryDTO>()
    for (const category of categories) {
      if (category?.id) {
        map.set(category.id, category)
      }
    }

    return this.buildMegaMenuContent(config, map)
  }
}
