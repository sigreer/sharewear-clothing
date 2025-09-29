import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ArrowTopRightOnSquare } from "@medusajs/icons"
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
    submenuCategoryIds: []
  })
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
            : []
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
        metadata: metadataMemo ?? null
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
            <ArrowTopRightOnSquare className="h-3.5 w-3.5" />
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
