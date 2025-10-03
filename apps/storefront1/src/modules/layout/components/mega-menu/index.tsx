'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type MegaMenuLink = {
  label: string
  href: string
  description?: string
  badge?: string
  icon?: string
  thumbnailUrl?: string
}

export type MegaMenuColumn = {
  heading: string
  description?: string
  imageUrl?: string
  items: MegaMenuLink[]
  columnLayout?: 'image' | 'image-with-text' | 'subcategory-icons' | 'text-and-icons'
  badge?: 'new' | 'offers' | 'free-shipping' | 'featured'
  categoryId?: string
}

export type MegaMenuFeaturedCard = {
  eyebrow?: string
  label: string
  href: string
  description?: string
  ctaLabel?: string
  imageUrl?: string
}

export type MegaMenuContent = {
  tagline?: string
  layout?: 'default' | 'thumbnail-grid'
  columns: MegaMenuColumn[]
  featured?: MegaMenuFeaturedCard[]
}

interface MegaMenuPanelProps {
  content: MegaMenuContent
  onNavigate?: () => void
}

const BADGE_STYLES = {
  'new': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'offers': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'free-shipping': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'featured': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
}

const MegaMenuPanel: React.FC<MegaMenuPanelProps> = ({ content, onNavigate }) => {
  const renderColumnBadge = (badge?: string) => {
    if (!badge || !(badge in BADGE_STYLES)) return null
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded ${BADGE_STYLES[badge as keyof typeof BADGE_STYLES]}`}>
        {badge.replace('-', ' ').toUpperCase()}
      </span>
    )
  }

  const renderDefaultLayout = () => (
    <div className="flex flex-col gap-6">
      <div className="flex-1">
        <div className="grid gap-6 auto-cols-max" style={{ gridTemplateColumns: `repeat(${content.columns.length}, minmax(240px, 280px))` }}>
          {content.columns.map((column, index) => (
            <motion.div
              key={column.heading}
              className="space-y-4 min-w-[240px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              {/* Render column badge if present */}
              {column.badge && (
                <div className="mb-2">
                  {renderColumnBadge(column.badge)}
                </div>
              )}

              {/* Render image based on columnLayout */}
              {column.imageUrl && (column.columnLayout === 'image' || column.columnLayout === 'image-with-text' || !column.columnLayout) && (
                <div className="aspect-[4/3] w-full overflow-hidden rounded-lg">
                  <img
                    src={column.imageUrl}
                    alt={column.heading}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground flex items-center gap-2">
                  {column.heading}
                </p>
                {column.description && (column.columnLayout === 'image-with-text' || column.columnLayout === 'text-and-icons' || !column.columnLayout) && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {column.description}
                  </p>
                )}
              </div>

              <ul className={column.columnLayout === 'subcategory-icons' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                {column.items.map((item) => (
                  <li key={item.label}>
                    <LocalizedClientLink
                      href={item.href}
                      className={`group flex gap-2 rounded-lg p-2 transition-colors hover:bg-muted/70 ${
                        column.columnLayout === 'subcategory-icons' ? 'flex-col items-center text-center' : ''
                      }`}
                      onClick={onNavigate}
                    >
                      {column.columnLayout === 'subcategory-icons' && item.thumbnailUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                          <img src={item.thumbnailUrl} alt={item.label} className="w-full h-full object-cover" />
                        </div>
                      ) : item.icon ? (
                        <span className="mt-0.5 text-base" aria-hidden>{item.icon}</span>
                      ) : null}
                      <span className="flex-1">
                        <span className="flex items-center gap-2 text-base font-medium text-foreground transition-colors group-hover:text-primary">
                          {item.label}
                          {item.badge ? (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                        {item.description && column.columnLayout !== 'subcategory-icons' ? (
                          <span className="mt-0.5 block text-sm text-muted-foreground leading-relaxed">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {content.featured?.length ? (
        <div className="flex w-full flex-col gap-4 md:w-64">
          {content.featured.map((card) => (
            <LocalizedClientLink
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-lg transition-transform hover:-translate-y-1"
              onClick={onNavigate}
            >
              <div
                className="h-32 w-full bg-gradient-to-br from-muted/60 via-muted/30 to-muted"
                style={card.imageUrl ? { backgroundImage: `url(${card.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              />
              <div className="space-y-2 p-4">
                {card.eyebrow ? (
                  <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                    {card.eyebrow}
                  </span>
                ) : null}
                <p className="text-xl font-semibold text-foreground">
                  {card.label}
                </p>
                {card.description ? (
                  <p className="text-base leading-snug text-muted-foreground">
                    {card.description}
                  </p>
                ) : null}
                {card.ctaLabel ? (
                  <span className="inline-flex items-center gap-1 text-base font-semibold text-primary">
                    {card.ctaLabel}
                    <span aria-hidden>→</span>
                  </span>
                ) : null}
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      ) : null}
    </div>
  )

  const renderThumbnailGridLayout = () => (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(content.columns.length, 3)}, minmax(240px, 280px))` }}>
        {content.columns.map((column, index) => (
          <motion.div
            key={column.heading || `column-${index}`}
            className="space-y-4 min-w-[240px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.06,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {(column.heading || column.description) && (
              <div className="space-y-1">
                {column.heading ? (
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {column.heading}
                  </p>
                ) : null}
                {column.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {column.description}
                  </p>
                ) : null}
              </div>
            )}

            <ul className="space-y-3">
              {column.items.map((item) => (
                <li key={item.label}>
                  <LocalizedClientLink
                    href={item.href}
                    className="group block"
                    onClick={onNavigate}
                  >
                    <div className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-muted/80">
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">
                            {item.icon ?? '🧩'}
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                          {item.label}
                        </span>
                        {item.description ? (
                          <span className="truncate text-sm text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  )

  const isThumbnailGrid = content.layout === 'thumbnail-grid'

  return (
    <div className="flex w-auto max-w-fit flex-col gap-6 rounded-b-md border-2 border-t-0 bg-background p-6 text-popover-foreground shadow-2xl">
      {content.tagline ? (
        <p className="text-base font-medium text-muted-foreground">
          {content.tagline}
        </p>
      ) : null}

      {isThumbnailGrid ? renderThumbnailGridLayout() : renderDefaultLayout()}
    </div>
  )
}

export default MegaMenuPanel
