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
  type MegaMenuLegacyLayout,
  type MegaMenuLink,
  type MegaMenuLinkConfig,
  type MegaMenuModuleOptions,
  type MegaMenuNavigationItem
} from "./types"
import type { DynamicCategoryMenuItem } from "../dynamic-category-menu"

const DEFAULT_BASE_HREF = "/store?category="
const AUTO_ITEMS_CHUNK_SIZE = 3

const MENU_LAYOUTS: MegaMenuLayout[] = ["no-menu", "simple-dropdown", "rich-columns"]
const LEGACY_LAYOUTS: MegaMenuLegacyLayout[] = ["default", "thumbnail-grid"]

const isMenuLayout = (value: unknown): value is MegaMenuLayout =>
  typeof value === "string" && MENU_LAYOUTS.includes(value as MegaMenuLayout)

const isLegacyLayout = (value: unknown): value is MegaMenuLegacyLayout =>
  typeof value === "string" && LEGACY_LAYOUTS.includes(value as MegaMenuLegacyLayout)

type InjectedDependencies = {
  logger: Logger
}

type MegaMenuConfigEntity = InferEntityType<typeof MegaMenuConfig>

type NormalizedOptions = {
  baseHref: string
  defaultMenuLayout: MegaMenuLayout
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
      defaultMenuLayout: isMenuLayout(options.defaultLayout)
        ? options.defaultLayout
        : "simple-dropdown"
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
    const defaultMenuLayout = globalConfig?.defaultMenuLayout || this.options_.defaultMenuLayout

    // Build category hierarchy map to understand parent-child relationships
    const parentMap = new Map<string, string>() // childId -> parentId
    const buildParentMap = (items: DynamicCategoryMenuItem[], parentId?: string) => {
      for (const item of items) {
        if (parentId) {
          parentMap.set(item.id, parentId)
        }
        if (item.children?.length) {
          buildParentMap(item.children, item.id)
        }
      }
    }
    buildParentMap(navigation)

    const apply = async (
      items: DynamicCategoryMenuItem[],
      depth: number = 0
    ): Promise<MegaMenuNavigationItem[]> => {
      const results: MegaMenuNavigationItem[] = []

      for (const item of items) {
        const config = configMap.get(item.id)

        // Check if excluded from menu
        if (config?.excludedFromMenu) {
          continue
        }

        // Determine menu layout for this category
        const menuLayout = config?.menuLayout || defaultMenuLayout

        // Get parent config to determine what options are available
        const parentId = parentMap.get(item.id)
        const parentConfig = parentId ? configMap.get(parentId) : null
        const parentMenuLayout = parentConfig?.menuLayout || defaultMenuLayout

        // Build navigation item with appropriate fields based on depth
        const navItem: MegaMenuNavigationItem = {
          ...item,
          menuLayout,
          children: []
        }

        // Add second-level category fields (when parent has rich-columns layout)
        if (depth === 1 && parentMenuLayout === "rich-columns") {
          // Column display fields (used when displayAsColumn: true)
          navItem.displayAsColumn = config?.displayAsColumn ?? null
          navItem.columnTitle = config?.columnTitle ?? null
          navItem.columnDescription = config?.columnDescription ?? null
          navItem.columnImageUrl = config?.columnImageUrl ?? null
          navItem.columnBadge = config?.columnBadge ?? null

          // Item display fields (used when the second-level item is displayed in parent's menu)
          navItem.icon = config?.icon ?? null
          navItem.thumbnailUrl = config?.thumbnailUrl ?? null
          navItem.title = config?.title ?? null
          navItem.subtitle = config?.subtitle ?? null
        }

        // Add third-level category fields (when grandparent has rich-columns layout)
        if (depth === 2) {
          const grandparentId = parentId ? parentMap.get(parentId) : null
          const grandparentConfig = grandparentId ? configMap.get(grandparentId) : null
          const grandparentMenuLayout = grandparentConfig?.menuLayout || defaultMenuLayout

          if (grandparentMenuLayout === "rich-columns") {
            navItem.icon = config?.icon ?? null
            navItem.thumbnailUrl = config?.thumbnailUrl ?? null
            navItem.title = config?.title ?? null
            navItem.subtitle = config?.subtitle ?? null
          }
        }

        // Process children based on menu layout
        if (menuLayout !== "no-menu" && item.children?.length) {
          // Limit to 3 levels of depth
          if (depth < 2) {
            navItem.children = await apply(item.children, depth + 1)
          }
        }

        results.push(navItem)
      }

      return results
    }

    return apply(navigation)
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
      .filter(column => column !== null) as MegaMenuColumn[]
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
      .filter(card => card !== null) as MegaMenuFeaturedCard[]
  }

  protected async buildAutomaticItems(
    categoryIds: string[] | undefined,
    categoryMap: Map<string, ProductCategoryDTO>,
    configMap?: Map<string, MegaMenuConfigDTO>
  ): Promise<MegaMenuLink[]> {
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

      // Get subcategory-specific configuration if available
      const subcategoryConfig = configMap?.get(categoryId)

      items.push({
        label,
        href,
        description: normalizeNullableString(category.description) ?? undefined,
        badge: subcategoryConfig?.columnBadge ?? undefined,
        thumbnailUrl: subcategoryConfig?.columnImageUrl ?? undefined
      })
    }

    return items
  }

  protected async buildAutomaticColumns(
    items: MegaMenuLink[],
    layout: MegaMenuLayout,
    metadata: Record<string, unknown> | null,
    configMap?: Map<string, MegaMenuConfigDTO>,
    categoryIds?: string[]
  ): Promise<MegaMenuColumn[]> {
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

        // If we have category IDs, get the config for the first item in the chunk
        const categoryId = categoryIds?.[index]
        const subcategoryConfig = categoryId ? configMap?.get(categoryId) : undefined

        columns.push({
          heading: headingCandidate ?? undefined,
          items: chunk,
          columnLayout: subcategoryConfig?.columnLayout ?? undefined,
          badge: subcategoryConfig?.columnBadge ?? undefined,
          categoryId
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

    return {
      category_id: categoryId,

      // Global config field
      default_menu_layout: data.defaultMenuLayout ? normalizeNullableString(data.defaultMenuLayout) as any : null,

      // Per-category menu layout
      menu_layout: data.menuLayout ? normalizeNullableString(data.menuLayout) as any : null,

      // Category-level content fields
      tagline: normalizeNullableString(data.tagline),
      columns: this.normalizeColumns(data.columns) as any,
      featured: this.normalizeFeatured(data.featured) as any,
      submenu_category_ids: this.normalizeSubmenuCategoryIds(data.submenuCategoryIds) as any,
      metadata: this.normalizeMetadata(data.metadata),

      // Second-level category configuration
      display_as_column: data.displayAsColumn ?? null,
      column_title: normalizeNullableString(data.columnTitle),
      column_description: normalizeNullableString(data.columnDescription),
      column_image_url: normalizeNullableString(data.columnImageUrl),
      column_image_source: normalizeNullableString(data.columnImageSource) as any,
      column_badge: normalizeNullableString(data.columnBadge) as any,

      // Third-level category configuration
      icon: normalizeNullableString(data.icon),
      thumbnail_url: normalizeNullableString(data.thumbnailUrl),
      title: normalizeNullableString(data.title),
      subtitle: normalizeNullableString(data.subtitle),

      // Optional field to exclude category from menu
      excluded_from_menu: data.excludedFromMenu ?? false,

      // Legacy fields
      layout: data.layout ? normalizeNullableString(data.layout) as any : null,
      display_mode: normalizeNullableString(data.displayMode) as any,
      column_layout: normalizeNullableString(data.columnLayout) as any,

      deleted_at: null
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

      // Global config field
      defaultMenuLayout: normalizeNullableString((entity as any).default_menu_layout) as any,

      // Per-category menu layout
      menuLayout: normalizeNullableString((entity as any).menu_layout) as any,

      // Category-level content fields
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

      // Second-level category configuration
      displayAsColumn: (entity as any).display_as_column ?? null,
      columnTitle: normalizeNullableString((entity as any).column_title),
      columnDescription: normalizeNullableString((entity as any).column_description),
      columnImageUrl: normalizeNullableString((entity as any).column_image_url),
      columnImageSource: normalizeNullableString((entity as any).column_image_source) as any,
      columnBadge: normalizeNullableString((entity as any).column_badge) as any,

      // Third-level category configuration
      icon: normalizeNullableString((entity as any).icon),
      thumbnailUrl: normalizeNullableString((entity as any).thumbnail_url),
      title: normalizeNullableString((entity as any).title),
      subtitle: normalizeNullableString((entity as any).subtitle),

      // Optional field to exclude category from menu
      excludedFromMenu: (entity as any).excluded_from_menu ?? false,

      // Legacy fields
      layout: normalizeNullableString((entity as any).layout) as any,
      displayMode: normalizeNullableString((entity as any).display_mode) as any,
      columnLayout: normalizeNullableString((entity as any).column_layout) as any,

      createdAt: entity.created_at,
      updatedAt: entity.updated_at
    }
  }

  getDefaults(): { defaultMenuLayout: MegaMenuLayout; baseHref: string } {
    return {
      defaultMenuLayout: this.options_.defaultMenuLayout,
      baseHref: this.options_.baseHref
    }
  }
}
