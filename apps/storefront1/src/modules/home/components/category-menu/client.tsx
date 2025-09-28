"use client"

import * as React from "react"

import { cn } from "@lib/utils"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  CategorySelectorEntry,
  CategorySelectorPresentation,
} from "@lib/data/category-selector"

interface CategoryMenuClientProps {
  presentation: CategorySelectorPresentation
  categories: CategorySelectorEntry[]
}

type PreparedCategory = {
  id: string
  href: string
  name: string
  description: string | null
  imageUrl: string
  imageAlt: string
  highlight?: string
  supporting?: string
  mode: CategorySelectorEntry["mode"]
  representationType: CategorySelectorEntry["representation"]["type"]
  scaleMode: CategorySelectorPresentation["scale_mode"]
}

const SCALE_MODE_CLASS: Record<CategorySelectorPresentation["scale_mode"], string> = {
  cover: "object-cover",
  fit_width: "object-contain",
  fit_height: "object-contain",
  shortest_side: "object-contain",
  longest_side: "object-cover",
}

const GRID_CLASS_BY_COLUMNS = (columns: number) => {
  if (columns <= 1) {
    return "grid grid-cols-1"
  }

  if (columns === 2) {
    return "grid grid-cols-1 sm:grid-cols-2"
  }

  if (columns === 3) {
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
  }

  if (columns === 4) {
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  }

  return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
}

const shuffle = <T,>(list: T[]): T[] => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

type RandomPoolEntry = CategorySelectorEntry["representation"] extends {
  type: "random_pool"
  pool: infer T
}
  ? T
  : never

const resolveImageFromRandomPool = (
  pool: RandomPoolEntry,
  shouldRandomize: boolean
) => {
  if (!Array.isArray(pool) || pool.length === 0) {
    return null
  }

  const index = shouldRandomize ? Math.floor(Math.random() * pool.length) : 0
  const product = pool[index] ?? pool[0]

  if (!product) {
    return null
  }

  const primaryImage = product.thumbnail || product.images.find((image) => Boolean(image.url))?.url || null
  const alt = product.images.find((image) => Boolean(image.alt_text))?.alt_text || product.title

  if (!primaryImage) {
    return null
  }

  return {
    imageUrl: primaryImage,
    imageAlt: alt ?? product.title ?? "",
    highlight: product.title,
    supporting: product.description,
  }
}

const prepareCategories = (
  categories: CategorySelectorEntry[],
  presentation: CategorySelectorPresentation
): PreparedCategory[] => {
  const prepared: PreparedCategory[] = categories
    .map((category) => {
      const effectivePresentation = category.presentation ?? presentation
      const scaleMode = effectivePresentation.scale_mode
      const representation = category.representation

      let imageUrl: string | null = null
      let imageAlt = category.name
      let highlight: string | undefined
      let supporting: string | undefined

      if (representation.type === "custom_image") {
        imageUrl = representation.custom_image_url
        imageAlt = category.name
      } else if (representation.type === "product_image") {
        imageUrl =
          representation.image?.url ||
          representation.product?.thumbnail ||
          representation.product?.images.find((image) => Boolean(image.url))?.url ||
          null
        imageAlt =
          representation.image?.alt_text ||
          representation.product?.title ||
          category.name
        highlight = representation.product?.title ?? undefined
        supporting = representation.product?.description ?? undefined
      } else if (representation.type === "random_pool") {
        const resolved = resolveImageFromRandomPool(
          representation.pool,
          effectivePresentation.randomize_visible_categories
        )

        if (resolved) {
          imageUrl = resolved.imageUrl
          imageAlt = resolved.imageAlt || category.name
          highlight = resolved.highlight
          supporting = resolved.supporting ?? undefined
        }
      }

      if (!imageUrl) {
        return null
      }

      return {
        id: category.id,
        href: category.handle ? `/categories/${category.handle}` : `/categories/${category.id}`,
        name: category.name,
        description: category.description ?? null,
        imageUrl,
        imageAlt,
        highlight,
        supporting,
        mode: category.mode,
        representationType: representation.type,
        scaleMode,
      }
    })
    .filter((entry): entry is PreparedCategory => Boolean(entry))

  if (presentation.randomize_visible_categories) {
    return shuffle(prepared)
  }

  return prepared
}

type RenderCardProps = {
  category: PreparedCategory
  style: CategorySelectorPresentation["style"]
}

const FlippingCategoryCard: React.FC<RenderCardProps> = ({ category }) => {
  const scaleClass = SCALE_MODE_CLASS[category.scaleMode]

  return (
    <LocalizedClientLink
      href={category.href}
      className="group block h-full [perspective:1200px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
    >
      <div className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        <article className="absolute inset-0 flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md transition-transform [backface-visibility:hidden]">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
            <img
              src={category.imageUrl}
              alt={category.imageAlt}
              loading="lazy"
              className={cn("h-full w-full transition-transform duration-500 group-hover:scale-105", scaleClass)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-5">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Explore</p>
            <h3 className="text-xl font-semibold text-foreground">{category.name}</h3>
            {category.highlight ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{category.highlight}</p>
            ) : null}
          </div>
        </article>

        <article className="absolute inset-0 flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-primary/40 bg-primary text-primary-foreground shadow-xl transition-transform [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <div className="space-y-4 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-primary-foreground/70">Discover</p>
            <h3 className="text-2xl font-semibold">{category.name}</h3>
            {category.highlight ? (
              <p className="text-base font-medium text-primary-foreground/90">{category.highlight}</p>
            ) : null}
            {category.supporting ? (
              <p className="line-clamp-4 text-sm leading-relaxed text-primary-foreground/80">
                {category.supporting}
              </p>
            ) : null}
          </div>
          <div className="px-5 pb-5 text-sm font-semibold tracking-wide text-primary-foreground/80">
            Shop the edit →
          </div>
        </article>
      </div>
    </LocalizedClientLink>
  )
}

const StandardCategoryCard: React.FC<RenderCardProps> = ({ category, style }) => {
  const scaleClass = SCALE_MODE_CLASS[category.scaleMode]
  const isEdgeToEdge = style === "edge_to_edge"
  const imageAspect = style === "square" ? "aspect-square" : style === "edge_to_edge" ? "h-56 md:h-full" : "aspect-[4/5]"

  return (
    <LocalizedClientLink
      href={category.href}
      className={cn(
        "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
        style === "carousel" ? "w-[260px] flex-shrink-0 snap-center" : "h-full"
      )}
    >
      <article
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
          isEdgeToEdge && "md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
        )}
      >
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            imageAspect,
            isEdgeToEdge ? "md:h-full" : ""
          )}
        >
          <img
            src={category.imageUrl}
            alt={category.imageAlt}
            loading="lazy"
            className={cn(
              "h-full w-full transition-transform duration-500 group-hover:scale-105",
              scaleClass,
              isEdgeToEdge ? "md:h-full md:w-full" : ""
            )}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>

        <div className={cn(
          "flex flex-1 flex-col gap-3 p-5",
          isEdgeToEdge && "md:justify-center"
        )}>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Category</p>
            <h3 className="text-xl font-semibold text-foreground">{category.name}</h3>
          </div>
          {category.highlight ? (
            <p className="text-sm font-medium text-foreground/90">{category.highlight}</p>
          ) : null}
          {category.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {category.description}
            </p>
          ) : null}
          <span className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-primary/80">
            Shop now
            <span aria-hidden>→</span>
          </span>
        </div>
      </article>
    </LocalizedClientLink>
  )
}

const renderCategoryCard = (
  category: PreparedCategory,
  style: CategorySelectorPresentation["style"]
) => {
  if (style === "flips") {
    return <FlippingCategoryCard category={category} style={style} />
  }
  return <StandardCategoryCard category={category} style={style} />
}

const CategoryMenuClient: React.FC<CategoryMenuClientProps> = ({ presentation, categories }) => {
  const prepared = React.useMemo(() => prepareCategories(categories, presentation), [categories, presentation])

  if (!prepared.length) {
    return null
  }

  const style = presentation.style
  const maxColumns = Math.min(
    Math.max(1, presentation.max_columns ?? prepared.length),
    Math.max(1, prepared.length)
  )
  const gridClasses = GRID_CLASS_BY_COLUMNS(maxColumns)
  const maxVisibleFromDimensions =
    presentation.max_rows && presentation.max_columns
      ? presentation.max_rows * presentation.max_columns
      : undefined

  const visibleCategories = React.useMemo(() => {
    if (!maxVisibleFromDimensions) {
      return prepared
    }
    return prepared.slice(0, maxVisibleFromDimensions)
  }, [maxVisibleFromDimensions, prepared])

  return (
    <section className="py-12">
      <div className="content-container space-y-8">
        <header className="space-y-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Shop by Category</h2>
          <p className="text-sm text-muted-foreground">
            Tailored picks update automatically as your catalog evolves.
          </p>
        </header>

        {style === "carousel" ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 overflow-visible pr-4 md:pr-6">
              {visibleCategories.map((category) => (
                <div key={category.id} className="snap-center">
                  {renderCategoryCard(category, style)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("gap-6", gridClasses)}>
            {visibleCategories.map((category) => (
              <React.Fragment key={category.id}>
                {renderCategoryCard(category, style)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default CategoryMenuClient
