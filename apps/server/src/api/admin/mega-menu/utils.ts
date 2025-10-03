import type {
  MegaMenuColumnConfig,
  MegaMenuConfigDTO,
  MegaMenuConfigInput,
  MegaMenuLinkConfig
} from "../../../modules/mega-menu"

const ensureArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[]
  }
  return []
}

const collectFromColumns = (
  columns?: MegaMenuColumnConfig[] | null
): string[] => {
  if (!Array.isArray(columns)) {
    return []
  }

  const ids = new Set<string>()

  const enqueue = (items?: MegaMenuLinkConfig[] | null) => {
    if (!Array.isArray(items)) {
      return
    }

    for (const item of items) {
      const idCandidate = typeof item?.categoryId === "string"
        ? item.categoryId.trim()
        : undefined

      if (idCandidate) {
        ids.add(idCandidate)
      }
    }
  }

  for (const column of columns) {
    enqueue(column?.items ?? null)
  }

  return Array.from(ids)
}

export const collectCategoryIdsFromConfig = (
  config: MegaMenuConfigDTO | MegaMenuConfigInput | null | undefined
): string[] => {
  if (!config) {
    return []
  }

  const ids = new Set<string>()

  ensureArray<string>(
    (config as any).submenu_category_ids ?? config.submenuCategoryIds
  ).forEach(id => {
    if (typeof id === "string" && id.trim().length) {
      ids.add(id.trim())
    }
  })

  collectFromColumns(
    (config as any).columns ?? []
  ).forEach(id => ids.add(id))

  return Array.from(ids)
}

export const pickMegaMenuPayload = (
  body: any
): Partial<MegaMenuConfigInput> => {
  if (!body || typeof body !== "object") {
    return {}
  }

  const {
    // Global config field
    defaultMenuLayout,
    default_menu_layout,

    // Per-category menu layout
    menuLayout,
    menu_layout,

    // Category-level content fields
    tagline,
    columns,
    featured,
    submenuCategoryIds,
    submenu_category_ids,
    metadata,

    // Second-level category configuration
    displayAsColumn,
    display_as_column,
    columnTitle,
    column_title,
    columnDescription,
    column_description,
    columnImageUrl,
    column_image_url,
    columnImageSource,
    column_image_source,
    columnBadge,
    column_badge,

    // Third-level category configuration
    icon,
    thumbnailUrl,
    thumbnail_url,
    title,
    subtitle,

    // Optional field to exclude category from menu
    excludedFromMenu,
    excluded_from_menu,

    // Legacy fields
    layout,
    displayMode,
    display_mode,
    columnLayout,
    column_layout
  } = body as Record<string, unknown>

  return {
    defaultMenuLayout: (defaultMenuLayout ?? default_menu_layout) as MegaMenuConfigInput["defaultMenuLayout"],
    menuLayout: (menuLayout ?? menu_layout) as MegaMenuConfigInput["menuLayout"],
    tagline: tagline as MegaMenuConfigInput["tagline"],
    columns: columns as MegaMenuConfigInput["columns"],
    featured: featured as MegaMenuConfigInput["featured"],
    submenuCategoryIds: ensureArray<string>(
      submenuCategoryIds ?? submenu_category_ids
    ),
    metadata: metadata as MegaMenuConfigInput["metadata"],
    displayAsColumn: (displayAsColumn ?? display_as_column) as MegaMenuConfigInput["displayAsColumn"],
    columnTitle: (columnTitle ?? column_title) as MegaMenuConfigInput["columnTitle"],
    columnDescription: (columnDescription ?? column_description) as MegaMenuConfigInput["columnDescription"],
    columnImageUrl: (columnImageUrl ?? column_image_url) as MegaMenuConfigInput["columnImageUrl"],
    columnImageSource: (columnImageSource ?? column_image_source) as MegaMenuConfigInput["columnImageSource"],
    columnBadge: (columnBadge ?? column_badge) as MegaMenuConfigInput["columnBadge"],
    icon: icon as MegaMenuConfigInput["icon"],
    thumbnailUrl: (thumbnailUrl ?? thumbnail_url) as MegaMenuConfigInput["thumbnailUrl"],
    title: title as MegaMenuConfigInput["title"],
    subtitle: subtitle as MegaMenuConfigInput["subtitle"],
    excludedFromMenu: (excludedFromMenu ?? excluded_from_menu) as MegaMenuConfigInput["excludedFromMenu"],
    layout: layout as MegaMenuConfigInput["layout"],
    displayMode: (displayMode ?? display_mode) as MegaMenuConfigInput["displayMode"],
    columnLayout: (columnLayout ?? column_layout) as MegaMenuConfigInput["columnLayout"]
  }
}
