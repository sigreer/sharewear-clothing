import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import {
  Badge,
  Button,
  Input,
  Select,
  Text,
  toast
} from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import { useNavigate } from "react-router-dom"
import type {
  MegaMenuColumnConfig,
  MegaMenuConfigDTO,
  MegaMenuContent,
  MegaMenuFeaturedCardConfig,
  MegaMenuLayout
} from "../../../../modules/mega-menu"

const LAYOUT_LABELS: Record<MegaMenuLayout, string> = {
  default: "Default",
  "thumbnail-grid": "Thumbnail grid"
}

type MegaMenuDefaults = {
  layout: MegaMenuLayout
  tagline: string | null
  baseHref: string
}

type CategoryDetailResponse = {
  category: {
    id: string
    name: string | null
    handle: string | null
    description: string | null
    parent_category_id: string | null
  }
  config: MegaMenuConfigDTO | null
  inherited: MegaMenuConfigDTO | null
  preview: MegaMenuContent | null
  defaults: MegaMenuDefaults
  availableLayouts: MegaMenuLayout[]
}

type DisplayMode = "simple-dropdown" | "columns"
type ColumnLayout = "image" | "image-with-text" | "subcategory-icons" | "text-and-icons"
type ColumnBadge = "new" | "offers" | "free-shipping" | "featured"

type CategoriesResponse = {
  categories: Array<{
    id: string
    name: string | null
    handle: string | null
    description: string | null
  }>
}

type CategoryOption = {
  id: string
  label: string
}

type DraftState = {
  layout: MegaMenuLayout
  tagline: string
  submenuCategoryIds: string[]
  // Parent category fields
  displayMode: DisplayMode | null
  // Subcategory column fields
  columnLayout: ColumnLayout | null
  columnImageUrl: string | null
  columnBadge: ColumnBadge | null
}

const formatCategoryLabel = (category: { id: string; name: string | null; handle: string | null }) => {
  const parts = [category.name, category.handle].filter((value): value is string => Boolean(value))
  return parts.length ? parts.join(" · ") : category.id
}

const MegaMenuCategoryWidget = ({
  data
}: {
  data?: HttpTypes.AdminProductCategory
}) => {
  const navigate = useNavigate()
  const categoryId = data?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<MegaMenuConfigDTO | null>(null)
  const [inherited, setInherited] = useState<MegaMenuConfigDTO | null>(null)
  const [defaults, setDefaults] = useState<MegaMenuDefaults | null>(null)
  const [preview, setPreview] = useState<MegaMenuContent | null>(null)
  const [draft, setDraft] = useState<DraftState>({
    layout: "default",
    tagline: "",
    submenuCategoryIds: [],
    displayMode: null,
    columnLayout: null,
    columnImageUrl: null,
    columnBadge: null
  })
  const [category, setCategory] = useState<CategoryDetailResponse["category"] | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [columnsMemo, setColumnsMemo] = useState<MegaMenuColumnConfig[] | null>(null)
  const [featuredMemo, setFeaturedMemo] = useState<MegaMenuFeaturedCardConfig[] | null>(null)
  const [metadataMemo, setMetadataMemo] = useState<Record<string, unknown> | null>(null)

  const fetchJson = useCallback(async <T,>(
    url: string,
    init?: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      },
      ...init
    })

    if (response.status === 204) {
      return undefined as T
    }

    const data = await response
      .json()
      .catch(() => ({ message: "Unable to parse response" }))

    if (!response.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : `Request failed with status ${response.status}`
      throw new Error(message)
    }

    return data as T
  }, [])

  useEffect(() => {
    if (!categoryId) {
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [detail, categories] = await Promise.all([
          fetchJson<CategoryDetailResponse>(`/admin/mega-menu/${categoryId}`),
          fetchJson<CategoriesResponse>("/admin/mega-menu/categories?limit=200")
        ])

        if (cancelled) {
          return
        }

        setCategory(detail.category)
        setConfig(detail.config)
        setInherited(detail.inherited)
        setDefaults(detail.defaults)
        setPreview(detail.preview)
        setColumnsMemo(
          detail.config?.columns ?? detail.inherited?.columns ?? null
        )
        setFeaturedMemo(
          detail.config?.featured ?? detail.inherited?.featured ?? null
        )
        setMetadataMemo(
          detail.config?.metadata ?? detail.inherited?.metadata ?? null
        )
        setDraft({
          layout: (detail.config ?? detail.inherited)?.layout ?? detail.defaults.layout,
          tagline:
            (detail.config ?? detail.inherited)?.tagline ??
            detail.defaults.tagline ??
            "",
          submenuCategoryIds: Array.isArray((detail.config ?? detail.inherited)?.submenuCategoryIds)
            ? [
                ...((detail.config ?? detail.inherited)!.submenuCategoryIds as string[])
              ]
            : [],
          displayMode: (detail.config ?? detail.inherited)?.displayMode ?? null,
          columnLayout: (detail.config ?? detail.inherited)?.columnLayout ?? null,
          columnImageUrl: (detail.config ?? detail.inherited)?.columnImageUrl ?? null,
          columnBadge: (detail.config ?? detail.inherited)?.columnBadge ?? null
        })
        setCategoryOptions(
          categories.categories.map(option => ({
            id: option.id,
            label: formatCategoryLabel(option)
          }))
        )
      } catch (error) {
        if (cancelled) {
          return
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load mega menu details."
        setError(message)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [categoryId, fetchJson])

  const handleLayoutChange = useCallback((layout: MegaMenuLayout) => {
    setDraft(prev => ({ ...prev, layout }))
  }, [])

  const handleTaglineChange = useCallback((value: string) => {
    setDraft(prev => ({ ...prev, tagline: value }))
  }, [])

  const handleAddSubmenuCategory = useCallback((value: string) => {
    if (!value) {
      return
    }

    setDraft(prev => {
      if (prev.submenuCategoryIds.includes(value)) {
        return prev
      }

      return {
        ...prev,
        submenuCategoryIds: [...prev.submenuCategoryIds, value]
      }
    })
  }, [])

  const handleRemoveSubmenuCategory = useCallback((value: string) => {
    setDraft(prev => ({
      ...prev,
      submenuCategoryIds: prev.submenuCategoryIds.filter(id => id !== value)
    }))
  }, [])

  const handleReset = useCallback(() => {
    setDraft({
      layout: config?.layout ?? defaults?.layout ?? "default",
      tagline: config?.tagline ?? inherited?.tagline ?? defaults?.tagline ?? "",
      submenuCategoryIds: Array.isArray(config?.submenuCategoryIds)
        ? [...config.submenuCategoryIds]
        : Array.isArray(inherited?.submenuCategoryIds)
          ? [...inherited.submenuCategoryIds]
          : []
    })
  }, [config, defaults, inherited])

  const handleSave = useCallback(async () => {
    if (!categoryId) {
      return
    }

    if (saving) {
      return
    }

    setSaving(true)

    try {
      const payload = {
        layout: draft.layout,
        tagline: draft.tagline.trim().length ? draft.tagline.trim() : null,
        submenuCategoryIds: draft.submenuCategoryIds,
        columns: columnsMemo ?? [],
        featured: featuredMemo ?? [],
        metadata: metadataMemo ?? null,
        displayMode: draft.displayMode,
        columnLayout: draft.columnLayout,
        columnImageUrl: draft.columnImageUrl,
        columnBadge: draft.columnBadge
      }

      const data = await fetchJson<{ config: MegaMenuConfigDTO; preview: MegaMenuContent | null }>(
        `/admin/mega-menu/${categoryId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      )

      setConfig(data.config)
      setPreview(data.preview)
      setColumnsMemo(data.config.columns ?? null)
      setFeaturedMemo(data.config.featured ?? null)
      setMetadataMemo(data.config.metadata ?? null)
      setDraft({
        layout: data.config.layout,
        tagline: data.config.tagline ?? "",
        submenuCategoryIds: Array.isArray(data.config.submenuCategoryIds)
          ? [...data.config.submenuCategoryIds]
          : []
      })

      toast.success("Mega menu updated")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update mega menu configuration."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [categoryId, columnsMemo, draft, featuredMemo, fetchJson, metadataMemo, saving])

  const handleRemove = useCallback(async () => {
    if (!categoryId) {
      return
    }

    try {
      await fetch(`/admin/mega-menu/${categoryId}`, {
        method: "DELETE"
      })

      setConfig(null)
      setColumnsMemo(null)
      setFeaturedMemo(null)
      setMetadataMemo(null)
      setPreview(null)
      setDraft({
        layout: inherited?.layout ?? defaults?.layout ?? "default",
        tagline: inherited?.tagline ?? defaults?.tagline ?? "",
        submenuCategoryIds: Array.isArray(inherited?.submenuCategoryIds)
          ? [...inherited.submenuCategoryIds]
          : []
      })
      toast.success("Mega menu reset to global defaults")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove mega menu configuration."
      toast.error(message)
    }
  }, [categoryId, defaults, inherited])

  const statusBadge = useMemo(() => {
    if (loading) {
      return null
    }

    if (config) {
      return <Badge color="green">Custom layout</Badge>
    }

    return <Badge variant="secondary">Inheriting global</Badge>
  }, [config, loading])

  if (!categoryId) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-ui-border-base bg-ui-bg-component p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Text className="text-lg font-semibold">Mega Menu</Text>
          <Text size="small" className="text-ui-fg-muted">
            Control the layout and featured submenu for this category.
          </Text>
        </div>
        <div className="flex gap-2">
          {statusBadge}
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate("/catalog/mega-menu")}
          >
            <ArrowUpRightOnBox className="h-3.5 w-3.5" />
            Manage all
          </Button>
        </div>
      </div>

      {error ? (
        <Text className="text-ui-fg-error">{error}</Text>
      ) : loading ? (
        <Text size="small" className="text-ui-fg-muted">
          Loading mega menu configuration…
        </Text>
      ) : (
        <>
          {/* Parent categories get display mode selection */}
          {!category?.parent_category_id && (
            <div className="grid gap-2">
              <Text size="small" className="font-medium">
                Display mode
              </Text>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={draft.displayMode === "simple-dropdown" ? "primary" : "secondary"}
                  size="small"
                  onClick={() => setDraft(prev => ({ ...prev, displayMode: "simple-dropdown" }))}
                >
                  Simple Dropdown
                </Button>
                <Button
                  variant={draft.displayMode === "columns" ? "primary" : "secondary"}
                  size="small"
                  onClick={() => setDraft(prev => ({ ...prev, displayMode: "columns" }))}
                >
                  Columns
                </Button>
              </div>
              <Text size="xsmall" className="text-ui-fg-muted">
                Simple dropdown shows a basic hover menu. Columns enables rich customizable content in subcategories.
              </Text>
            </div>
          )}

          {/* Subcategories get column layout configuration */}
          {category?.parent_category_id && (
            <>
              <div className="grid gap-2">
                <Text size="small" className="font-medium">
                  Column layout
                </Text>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={draft.columnLayout === "image" ? "primary" : "secondary"}
                    size="small"
                    onClick={() => setDraft(prev => ({ ...prev, columnLayout: "image" }))}
                  >
                    Image
                  </Button>
                  <Button
                    variant={draft.columnLayout === "image-with-text" ? "primary" : "secondary"}
                    size="small"
                    onClick={() => setDraft(prev => ({ ...prev, columnLayout: "image-with-text" }))}
                  >
                    Image with Text
                  </Button>
                  <Button
                    variant={draft.columnLayout === "subcategory-icons" ? "primary" : "secondary"}
                    size="small"
                    onClick={() => setDraft(prev => ({ ...prev, columnLayout: "subcategory-icons" }))}
                  >
                    Subcategory Icons
                  </Button>
                  <Button
                    variant={draft.columnLayout === "text-and-icons" ? "primary" : "secondary"}
                    size="small"
                    onClick={() => setDraft(prev => ({ ...prev, columnLayout: "text-and-icons" }))}
                  >
                    Text & Icons
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Text size="small" className="font-medium">
                  Column image
                </Text>
                <div className="grid gap-3">
                  {draft.columnImageUrl && (
                    <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-ui-border-base">
                      <img
                        src={draft.columnImageUrl}
                        alt="Column preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setDraft(prev => ({ ...prev, columnImageUrl: null }))}
                        className="absolute right-2 top-2 rounded-full bg-ui-bg-base p-1 shadow-md transition-colors hover:bg-ui-bg-base-hover"
                      >
                        <span className="text-ui-fg-subtle">×</span>
                      </button>
                    </div>
                  )}
                  <Input
                    value={draft.columnImageUrl ?? ""}
                    onChange={event => setDraft(prev => ({ ...prev, columnImageUrl: event.target.value || null }))}
                    placeholder="Paste image URL or use file input below"
                  />
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="column-image-upload"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return

                        const formData = new FormData()
                        formData.append('files', file)

                        try {
                          const response = await fetch('/admin/uploads', {
                            method: 'POST',
                            body: formData
                          })

                          if (response.ok) {
                            const data = await response.json()
                            const uploadedUrl = data.uploads?.[0]?.url
                            if (uploadedUrl) {
                              setDraft(prev => ({ ...prev, columnImageUrl: uploadedUrl }))
                              toast.success('Image uploaded successfully')
                            }
                          } else {
                            toast.error('Failed to upload image')
                          }
                        } catch (error) {
                          toast.error('Error uploading image')
                          console.error('Upload error:', error)
                        }
                      }}
                    />
                    <label htmlFor="column-image-upload">
                      <Button
                        variant="secondary"
                        size="small"
                        type="button"
                        onClick={() => document.getElementById('column-image-upload')?.click()}
                      >
                        Upload Image
                      </Button>
                    </label>
                    {category?.id && (
                      <Button
                        variant="secondary"
                        size="small"
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetchJson<{ products: Array<{ id: string; thumbnail?: string; images?: Array<{ url: string }> }> }>(
                              `/admin/products?category_id[]=${category.id}&fields=id,thumbnail,images&limit=20`
                            )

                            const imageUrls = response.products
                              .flatMap(p => {
                                const urls: string[] = []
                                if (p.thumbnail) urls.push(p.thumbnail)
                                if (p.images) urls.push(...p.images.map(img => img.url))
                                return urls
                              })
                              .filter((url): url is string => Boolean(url))

                            if (imageUrls.length > 0) {
                              // For now, just use the first image. In a real implementation,
                              // you'd show a modal with all images to choose from
                              setDraft(prev => ({ ...prev, columnImageUrl: imageUrls[0] }))
                              toast.success('Selected first product image')
                            } else {
                              toast.info('No product images found in this category')
                            }
                          } catch (error) {
                            toast.error('Failed to load product images')
                            console.error('Error loading product images:', error)
                          }
                        }}
                      >
                        Use Product Image
                      </Button>
                    )}
                  </div>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Upload a new image, paste a URL, or select from product images in this category
                  </Text>
                </div>
              </div>

              <div className="grid gap-2">
                <Text size="small" className="font-medium">
                  Badge
                </Text>
                <Select
                  value={draft.columnBadge ?? "none"}
                  onValueChange={value => setDraft(prev => ({ ...prev, columnBadge: value === "none" ? null : value as ColumnBadge }))}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="none">None</Select.Item>
                    <Select.Item value="new">New</Select.Item>
                    <Select.Item value="offers">Offers</Select.Item>
                    <Select.Item value="free-shipping">Free Shipping</Select.Item>
                    <Select.Item value="featured">Featured</Select.Item>
                  </Select.Content>
                </Select>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(LAYOUT_LABELS) as MegaMenuLayout[]).map(layout => (
              <Button
                key={layout}
                variant={draft.layout === layout ? "primary" : "secondary"}
                size="small"
                onClick={() => handleLayoutChange(layout)}
              >
                {LAYOUT_LABELS[layout]}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            <Text size="small" className="font-medium">
              Tagline
            </Text>
            <Input
              value={draft.tagline}
              onChange={event => handleTaglineChange(event.target.value)}
              placeholder="Optional tagline displayed at the top of the mega menu"
            />
          </div>

          <div className="grid gap-2">
            <Text size="small" className="font-medium">
              Submenu categories
            </Text>
            <Select
              onValueChange={value => handleAddSubmenuCategory(value)}
              disabled={!categoryOptions.length}
            >
              <Select.Trigger>
                <Select.Value placeholder="Add category" />
              </Select.Trigger>
              <Select.Content>
                {categoryOptions.map(option => (
                  <Select.Item key={option.id} value={option.id}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            {draft.submenuCategoryIds.length ? (
              <div className="flex flex-wrap gap-2">
                {draft.submenuCategoryIds.map(id => {
                  const label =
                    categoryOptions.find(option => option.id === id)?.label ?? id
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-2">
                      {label}
                      <button
                        type="button"
                        className="rounded-full px-1.5 py-0.5 text-xs font-semibold text-ui-fg-muted transition-colors hover:text-ui-fg-base"
                        onClick={() => handleRemoveSubmenuCategory(id)}
                      >
                        ×
                      </button>
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-muted">
                Select categories to feature inside this mega menu. If left empty, the menu will only use manual columns or global defaults.
              </Text>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={handleRemove}
              disabled={saving || (!config && !draft.submenuCategoryIds.length && !draft.tagline.length && draft.layout === (defaults?.layout ?? "default"))}
            >
              Remove customisation
            </Button>
            <Button
              size="small"
              onClick={handleSave}
              loading={saving}
            >
              Save
            </Button>
          </div>

          {preview ? (
            <Text size="small" className="text-ui-fg-muted">
              Preview ready · layout {LAYOUT_LABELS[preview.layout]}
            </Text>
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              Preview will be generated once the configuration contains content.
            </Text>
          )}
        </>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after"
})

export default MegaMenuCategoryWidget
