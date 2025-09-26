import { Logger } from "@medusajs/framework/types"
import { ProductCategoryDTO } from "@medusajs/types"
import {
  DynamicCategoryMenuItem,
  DynamicCategoryMenuOptions
} from "./types"

export const DYNAMIC_CATEGORY_MENU = "dynamic_category_menu"

type InjectedDependencies = {
  logger: Logger
}

type NormalizedOptions = Required<
  Pick<
    DynamicCategoryMenuOptions,
    | "baseHref"
    | "includeInternal"
    | "includeInactive"
    | "fallbackToId"
    | "fallbackPrefix"
  >
> &
  Pick<DynamicCategoryMenuOptions, "maxDepth" | "transformCategory">

const DEFAULT_OPTIONS: NormalizedOptions = {
  baseHref: "/store?category=",
  includeInternal: false,
  includeInactive: false,
  fallbackToId: true,
  fallbackPrefix: "",
  maxDepth: null,
  transformCategory: undefined
}

export default class DynamicCategoryMenuService {
  protected readonly logger_: Logger
  protected readonly options_: NormalizedOptions

  constructor(
    { logger }: InjectedDependencies,
    options: DynamicCategoryMenuOptions = {}
  ) {
    this.logger_ = logger
    this.options_ = {
      ...DEFAULT_OPTIONS,
      ...options
    }
  }

  async buildNavigationTree(
    categories: ProductCategoryDTO[]
  ): Promise<DynamicCategoryMenuItem[]> {
    const tree = this.transformCategories(categories)

    if (typeof this.logger_.debug === "function") {
      this.logger_.debug(
        `dynamic-category-menu: generated navigation tree (items=${tree.length}, totalCategories=${categories.length})`
      )
    }

    return tree
  }

  protected transformCategories(
    categories: ProductCategoryDTO[]
  ): DynamicCategoryMenuItem[] {
    const byParent = new Map<string | null, ProductCategoryDTO[]>()

    for (const category of categories) {
      const isExplicitlyInactive = category.is_active === false
      const isExplicitlyInternal = category.is_internal === true

      if (!this.options_.includeInactive && isExplicitlyInactive) {
        continue
      }

      if (!this.options_.includeInternal && isExplicitlyInternal) {
        continue
      }
      const parentId = category.parent_category_id ?? null
      const siblings = byParent.get(parentId)

      const enriched = category as ProductCategoryDTO & { __displayName?: string }
      enriched.__displayName = this.resolveDisplayName(category)

      if (siblings) {
        siblings.push(category)
      } else {
        byParent.set(parentId, [category])
      }
    }

    const sortCategories = (list: ProductCategoryDTO[]) =>
      list.sort((a, b) => {
        const rankA = typeof a.rank === "number" ? a.rank : Number.MAX_SAFE_INTEGER
        const rankB = typeof b.rank === "number" ? b.rank : Number.MAX_SAFE_INTEGER

        if (rankA === rankB) {
          const nameA = this.resolveDisplayName(a)
          const nameB = this.resolveDisplayName(b)

          return nameA.localeCompare(nameB)
        }

        return rankA - rankB
      })

    const build = (
      parentId: string | null,
      depth: number
    ): DynamicCategoryMenuItem[] => {
      const siblings = byParent.get(parentId)

      if (!siblings?.length) {
        return []
      }

      sortCategories(siblings)

      return siblings
        .map((category) => this.toNavigationItem(category, depth, build))
        .filter((item): item is DynamicCategoryMenuItem => Boolean(item))
    }

    return build(null, 0)
  }

  protected toNavigationItem(
    category: ProductCategoryDTO,
    depth: number,
    buildChildren: (
      parentId: string | null,
      depth: number
    ) => DynamicCategoryMenuItem[]
  ): DynamicCategoryMenuItem | null {
    const displayName = this.resolveDisplayName(category)
    const linkSource = this.resolveLinkSource(category)

    if (!linkSource) {
      return null
    }

    let children: DynamicCategoryMenuItem[] = []

    if (this.options_.maxDepth == null || depth + 1 < this.options_.maxDepth) {
      children = buildChildren(category.id, depth + 1)
    }

    const baseItem: DynamicCategoryMenuItem = {
      id: category.id,
      label: displayName || category.id,
      href: `${this.options_.baseHref}${encodeURIComponent(linkSource)}`,
      subLabel: category.description ?? undefined,
      children
    }

    if (typeof this.options_.transformCategory === "function") {
      const transformation = this.options_.transformCategory(category) || {}
      return {
        ...baseItem,
        ...transformation,
        children: transformation.children ?? baseItem.children
      }
    }

    return baseItem
  }

  protected normalizeText(value?: string | null): string {
    if (typeof value !== "string") {
      return ""
    }

    const trimmed = value.trim()
    return trimmed.length ? trimmed : ""
  }

  protected resolveDisplayName(category: ProductCategoryDTO): string {
    const name = this.normalizeText(category.name as string | undefined)
    const handle = this.normalizeText(category.handle as string | undefined)

    if (name.length) {
      return name
    }

    if (handle.length) {
      return handle
    }

    if (this.options_.fallbackToId && category.id) {
      const prefix = this.normalizeText(this.options_.fallbackPrefix)

      if (!prefix) {
        return category.id
      }

      return `${prefix} ${category.id}`
    }

    return category.id || ""
  }

  protected resolveLinkSource(category: ProductCategoryDTO): string {
    const handle = this.normalizeText(category.handle as string | undefined)

    if (handle.length) {
      return handle
    }

    if (this.options_.fallbackToId) {
      return category.id
    }

    return ""
  }
}
