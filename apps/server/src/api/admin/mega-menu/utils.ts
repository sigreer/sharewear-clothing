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
    layout,
    tagline,
    columns,
    featured,
    submenuCategoryIds,
    submenu_category_ids,
    metadata,
    displayMode,
    display_mode,
    columnLayout,
    column_layout,
    columnImageUrl,
    column_image_url,
    columnImageSource,
    column_image_source,
    columnBadge,
    column_badge
  } = body as Record<string, unknown>

  return {
    layout: layout as MegaMenuConfigInput["layout"],
    tagline: tagline as MegaMenuConfigInput["tagline"],
    columns: columns as MegaMenuConfigInput["columns"],
    featured: featured as MegaMenuConfigInput["featured"],
    submenuCategoryIds: ensureArray<string>(
      submenuCategoryIds ?? submenu_category_ids
    ),
    metadata: metadata as MegaMenuConfigInput["metadata"],
    displayMode: (displayMode ?? display_mode) as MegaMenuConfigInput["displayMode"],
    columnLayout: (columnLayout ?? column_layout) as MegaMenuConfigInput["columnLayout"],
    columnImageUrl: (columnImageUrl ?? column_image_url) as MegaMenuConfigInput["columnImageUrl"],
    columnImageSource: (columnImageSource ?? column_image_source) as MegaMenuConfigInput["columnImageSource"],
    columnBadge: (columnBadge ?? column_badge) as MegaMenuConfigInput["columnBadge"]
  }
}
