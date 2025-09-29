import { defineRouteConfig } from "@medusajs/admin-sdk"
import { LayoutGrid } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Select,
  Skeleton,
  Text,
  Textarea,
  toast
} from "@medusajs/ui"
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import type {
  MegaMenuColumnConfig,
  MegaMenuConfigDTO,
  MegaMenuContent,
  MegaMenuFeaturedCardConfig,
  MegaMenuLayout
} from "../../../../modules/mega-menu"

const AVAILABLE_LAYOUTS: MegaMenuLayout[] = ["default", "thumbnail-grid"]

type MegaMenuDefaults = {
  layout: MegaMenuLayout
  tagline: string | null
  baseHref: string
}

type GlobalResponse = {
  config: MegaMenuConfigDTO | null
  preview: MegaMenuContent | null
  defaults: MegaMenuDefaults
}

type CategoriesResponse = {
  categories: CategorySummary[]
  total: number
  availableLayouts: MegaMenuLayout[]
  defaults: MegaMenuDefaults
}

type CategorySummary = {
  id: string
  name: string | null
  handle: string | null
  description: string | null
  parent_category_id: string | null
  rank: number | null | undefined
  config: MegaMenuConfigDTO | null
}

type CategoryDetailResponse = {
  category: {
    id: string
    name: string | null
    handle: string | null
    description: string | null
    parent_category_id: string | null
    rank: number | null | undefined
  }
  config: MegaMenuConfigDTO | null
  inherited: MegaMenuConfigDTO | null
  preview: MegaMenuContent | null
  defaults: MegaMenuDefaults
  availableLayouts: MegaMenuLayout[]
}

type CategoryUpdateResponse = {
  categoryId: string
  config: MegaMenuConfigDTO
  preview: MegaMenuContent | null
}

type GlobalDraft = {
  layout: MegaMenuLayout
  tagline: string
  columnsText: string
  featuredText: string
}

type GlobalState = {
  loading: boolean
  saving: boolean
  config: MegaMenuConfigDTO | null
  preview: MegaMenuContent | null
  defaults: MegaMenuDefaults
  draft: GlobalDraft
}

type CategoryDraft = {
  layout: MegaMenuLayout
  tagline: string
  submenuCategoryIds: string[]
  columnsText: string
  featuredText: string
}

type CategoryModalState = {
  open: boolean
  loading: boolean
  saving: boolean
  category: CategorySummary | null
  draft: CategoryDraft
  preview: MegaMenuContent | null
  inherited: MegaMenuConfigDTO | null
  config: MegaMenuConfigDTO | null
  defaults: MegaMenuDefaults
  error: string | null
}

const serializeArray = <T,>(value: T[] | null | undefined): string => {
  if (!Array.isArray(value) || !value.length) {
    return ""
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return ""
  }
}

const createGlobalDraft = (
  config: MegaMenuConfigDTO | null,
  defaults: MegaMenuDefaults
): GlobalDraft => ({
  layout: config?.layout ?? defaults.layout,
  tagline: config?.tagline ?? defaults.tagline ?? "",
  columnsText: serializeArray(config?.columns),
  featuredText: serializeArray(config?.featured)
})

const createCategoryDraft = (
  config: MegaMenuConfigDTO | null,
  defaults: MegaMenuDefaults
): CategoryDraft => ({
  layout: config?.layout ?? defaults.layout,
  tagline: config?.tagline ?? defaults.tagline ?? "",
  submenuCategoryIds: Array.isArray(config?.submenuCategoryIds)
    ? [...config!.submenuCategoryIds]
    : [],
  columnsText: serializeArray(config?.columns),
  featuredText: serializeArray(config?.featured)
})

const createInitialGlobalState = (): GlobalState => ({
  loading: true,
  saving: false,
  config: null,
  preview: null,
  defaults: {
    layout: "default",
    tagline: null,
    baseHref: ""
  },
  draft: {
    layout: "default",
    tagline: "",
    columnsText: "",
    featuredText: ""
  }
})

const createCategoryModalState = (): CategoryModalState => ({
  open: false,
  loading: false,
  saving: false,
  category: null,
  draft: {
    layout: "default",
    tagline: "",
    submenuCategoryIds: [],
    columnsText: "",
    featuredText: ""
  },
  preview: null,
  inherited: null,
  config: null,
  defaults: {
    layout: "default",
    tagline: null,
    baseHref: ""
  },
  error: null
})

const formatCategoryLabel = (category: CategorySummary | CategoryDetailResponse["category"]): string => {
  const parts = [category.name, category.handle].filter((value): value is string => Boolean(value))
  if (parts.length) {
    return parts.join(" · ")
  }
  return category.id
}

const parseJsonArray = <T,>(
  label: string,
  value: string
): T[] | null => {
  const trimmed = value.trim()

  if (!trimmed.length) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)

    if (!Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON array.`)
    }

    return parsed as T[]
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : `${label} must be a valid JSON array.`
    )
    return null
  }
}

const fetchInitWithJson = (init?: RequestInit & { skipJsonHeader?: boolean }) => {
  if (!init) {
    return {}
  }

  const headers = new Headers(init.headers)

  if (!init.skipJsonHeader) {
    headers.set("Content-Type", "application/json")
  }

  return {
    ...init,
    headers
  }
}

const MegaMenuPage = () => {
  const [globalState, setGlobalState] = useState<GlobalState>(
    createInitialGlobalState
  )
  const [categoryState, setCategoryState] = useState<{
    loading: boolean
    error: string | null
    categories: CategorySummary[]
  }>({
    loading: true,
    error: null,
    categories: []
  })
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(
    createCategoryModalState
  )

  const fetchJson = useCallback(async <T,>(
    url: string,
    init?: RequestInit & { skipJsonHeader?: boolean }
  ): Promise<T> => {
    const response = await fetch(url, fetchInitWithJson(init))

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

  const loadData = useCallback(async () => {
    setGlobalState(prev => ({ ...prev, loading: true }))
    setCategoryState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const [global, categories] = await Promise.all([
        fetchJson<GlobalResponse>("/admin/mega-menu/global"),
        fetchJson<CategoriesResponse>("/admin/mega-menu/categories")
      ])

      setGlobalState({
        loading: false,
        saving: false,
        config: global.config,
        preview: global.preview,
        defaults: global.defaults,
        draft: createGlobalDraft(global.config, global.defaults)
      })

      setCategoryState({
        loading: false,
        error: null,
        categories: categories.categories
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load Mega Menu settings."
      setGlobalState(prev => ({ ...prev, loading: false }))
      setCategoryState({ loading: false, error: message, categories: [] })
      toast.error(message)
    }
  }, [fetchJson])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleGlobalDraftChange = useCallback(
    <K extends keyof GlobalDraft>(key: K, value: GlobalDraft[K]) => {
      setGlobalState(prev => ({
        ...prev,
        draft: {
          ...prev.draft,
          [key]: value
        }
      }))
    },
    []
  )

  const handleSaveGlobal = useCallback(async () => {
    if (globalState.saving) {
      return
    }

    const columns = parseJsonArray<MegaMenuColumnConfig>(
      "Columns",
      globalState.draft.columnsText
    )

    if (columns === null) {
      return
    }

    const featured = parseJsonArray<MegaMenuFeaturedCardConfig>(
      "Featured cards",
      globalState.draft.featuredText
    )

    if (featured === null) {
      return
    }

    setGlobalState(prev => ({ ...prev, saving: true }))

    try {
      const payload = {
        layout: globalState.draft.layout,
        tagline: globalState.draft.tagline.trim().length
          ? globalState.draft.tagline.trim()
          : null,
        columns,
        featured
      }

      const data = await fetchJson<{
        config: MegaMenuConfigDTO
        preview: MegaMenuContent | null
      }>("/admin/mega-menu/global", {
        method: "PUT",
        body: JSON.stringify(payload)
      })

      setGlobalState(prev => ({
        loading: false,
        saving: false,
        config: data.config,
        preview: data.preview,
        defaults: prev.defaults,
        draft: createGlobalDraft(data.config, prev.defaults)
      }))

      toast.success("Global mega menu settings saved")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save global settings."
      setGlobalState(prev => ({ ...prev, saving: false }))
      toast.error(message)
    }
  }, [fetchJson, globalState.draft, globalState.saving])

  const openCategoryModal = useCallback(
    async (category: CategorySummary) => {
      setCategoryModal(prev => ({
        ...prev,
        open: true,
        loading: true,
        saving: false,
        category,
        config: category.config ?? null,
        error: null
      }))

      try {
        const detail = await fetchJson<CategoryDetailResponse>(
          `/admin/mega-menu/${category.id}`
        )

        setCategoryModal({
          open: true,
          loading: false,
          saving: false,
          category,
          config: detail.config,
          draft: createCategoryDraft(detail.config ?? detail.inherited, detail.defaults),
          preview: detail.preview,
          inherited: detail.inherited,
          defaults: detail.defaults,
          error: null
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load category settings."
        setCategoryModal(createCategoryModalState())
        toast.error(message)
      }
    },
    [fetchJson]
  )

  const closeCategoryModal = useCallback(() => {
    setCategoryModal(createCategoryModalState())
  }, [])

  const handleCategoryDraftChange = useCallback(
    <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => {
      setCategoryModal(prev => ({
        ...prev,
        draft: {
          ...prev.draft,
          [key]: value
        }
      }))
    },
    []
  )

  const handleAddSubmenuCategory = useCallback((categoryId: string) => {
    setCategoryModal(prev => {
      if (!categoryId || prev.draft.submenuCategoryIds.includes(categoryId)) {
        return prev
      }

      return {
        ...prev,
        draft: {
          ...prev.draft,
          submenuCategoryIds: [...prev.draft.submenuCategoryIds, categoryId]
        }
      }
    })
  }, [])

  const handleRemoveSubmenuCategory = useCallback((categoryId: string) => {
    setCategoryModal(prev => ({
      ...prev,
      draft: {
        ...prev.draft,
        submenuCategoryIds: prev.draft.submenuCategoryIds.filter(
          id => id !== categoryId
        )
      }
    }))
  }, [])

  const handleResetCategoryDraft = useCallback(() => {
    setCategoryModal(prev => ({
      ...prev,
      draft: createCategoryDraft(prev.config ?? prev.inherited, prev.defaults)
    }))
  }, [])

  const handleSaveCategory = useCallback(async () => {
    if (!categoryModal.open || !categoryModal.category) {
      return
    }

    if (categoryModal.saving) {
      return
    }

    const columns = parseJsonArray<MegaMenuColumnConfig>(
      "Columns",
      categoryModal.draft.columnsText
    )
    if (columns === null) {
      return
    }

    const featured = parseJsonArray<MegaMenuFeaturedCardConfig>(
      "Featured cards",
      categoryModal.draft.featuredText
    )
    if (featured === null) {
      return
    }

    setCategoryModal(prev => ({ ...prev, saving: true }))

    try {
      const payload = {
        layout: categoryModal.draft.layout,
        tagline: categoryModal.draft.tagline.trim().length
          ? categoryModal.draft.tagline.trim()
          : null,
        submenuCategoryIds: categoryModal.draft.submenuCategoryIds,
        columns,
        featured
      }

      const data = await fetchJson<CategoryUpdateResponse>(
        `/admin/mega-menu/${categoryModal.category.id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      )

      setCategoryModal(prev => ({
        ...prev,
        saving: false,
        config: data.config,
        draft: createCategoryDraft(data.config, prev.defaults),
        preview: data.preview,
        inherited: null
      }))

      setCategoryState(prev => ({
        ...prev,
        categories: prev.categories.map(entry =>
          entry.id === data.categoryId
            ? { ...entry, config: data.config }
            : entry
        )
      }))

      toast.success("Category mega menu saved")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save category mega menu."
      setCategoryModal(prev => ({ ...prev, saving: false }))
      toast.error(message)
    }
  }, [categoryModal, fetchJson])

  const handleDeleteCategoryConfig = useCallback(async () => {
    if (!categoryModal.category) {
      return
    }

    try {
      await fetchJson<void>(`/admin/mega-menu/${categoryModal.category.id}`, {
        method: "DELETE",
        skipJsonHeader: true
      })

      setCategoryState(prev => ({
        ...prev,
        categories: prev.categories.map(entry =>
          entry.id === categoryModal.category?.id
            ? { ...entry, config: null }
            : entry
        )
      }))

      toast.success("Mega menu configuration removed")
      closeCategoryModal()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove category configuration."
      toast.error(message)
    }
  }, [categoryModal.category, closeCategoryModal, fetchJson])

  const categoryOptions = useMemo(() => {
    return categoryState.categories.map(category => ({
      id: category.id,
      label: formatCategoryLabel(category)
    }))
  }, [categoryState.categories])

  const selectedSubmenuEntries = useMemo(() => {
    if (!categoryModal.category) {
      return []
    }

    return categoryModal.draft.submenuCategoryIds
      .map(id => ({
        id,
        label:
          categoryOptions.find(option => option.id === id)?.label ?? id
      }))
  }, [categoryModal.category, categoryModal.draft.submenuCategoryIds, categoryOptions])

  const globalPreviewJson = useMemo(
    () =>
      globalState.preview
        ? JSON.stringify(globalState.preview, null, 2)
        : "No preview available",
    [globalState.preview]
  )

  const categoryPreviewJson = useMemo(
    () =>
      categoryModal.preview
        ? JSON.stringify(categoryModal.preview, null, 2)
        : categoryModal.inherited
          ? "Preview derived from global configuration"
          : "No preview configured",
    [categoryModal.preview, categoryModal.inherited]
  )

  return (
    <div className="flex flex-col gap-6">
      <Container className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Heading>Global Mega Menu</Heading>
          <Button
            variant="secondary"
            size="small"
            onClick={() =>
              setGlobalState(prev => ({
                ...prev,
                draft: createGlobalDraft(prev.config, prev.defaults)
              }))
            }
            disabled={globalState.loading || globalState.saving}
          >
            Reset draft
          </Button>
        </div>
        {globalState.loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Text className="font-semibold">Layout</Text>
              <div className="flex gap-2">
                {AVAILABLE_LAYOUTS.map(layout => (
                  <Button
                    key={layout}
                    variant={
                      globalState.draft.layout === layout ? "primary" : "secondary"
                    }
                    size="small"
                    onClick={() => handleGlobalDraftChange("layout", layout)}
                  >
                    {layout === "thumbnail-grid" ? "Thumbnail grid" : "Default"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Text className="font-semibold">Tagline</Text>
              <Input
                value={globalState.draft.tagline}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleGlobalDraftChange("tagline", event.target.value)
                }
                placeholder="Optional tagline displayed above the mega menu"
              />
            </div>

            <div className="grid gap-2">
              <Text className="font-semibold">Columns JSON</Text>
              <Textarea
                value={globalState.draft.columnsText}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  handleGlobalDraftChange("columnsText", event.target.value)
                }
                placeholder="[{\n  \"heading\": \"Featured\",\n  \"items\": []\n}]"
                rows={10}
              />
              <Text size="small" className="text-ui-fg-muted">
                Leave blank to rely on per-category configuration or autogenerated submenu items.
              </Text>
            </div>

            <div className="grid gap-2">
              <Text className="font-semibold">Featured JSON</Text>
              <Textarea
                value={globalState.draft.featuredText}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  handleGlobalDraftChange("featuredText", event.target.value)
                }
                placeholder="[{\n  \"label\": \"Spotlight\",\n  \"href\": \"/stories\"\n}]"
                rows={6}
              />
            </div>

            <div className="grid gap-2">
              <Text className="font-semibold">Preview</Text>
              <Textarea value={globalPreviewJson} readOnly rows={10} />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => void handleSaveGlobal()}
                loading={globalState.saving}
              >
                Save global configuration
              </Button>
            </div>
          </div>
        )}
      </Container>

      <Container className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Heading size="h2">Category Mega Menus</Heading>
          <Text className="text-ui-fg-muted">
            Configure layout overrides and submenu items for individual categories.
          </Text>
        </div>
        {categoryState.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : categoryState.error ? (
          <Text className="text-ui-fg-error">{categoryState.error}</Text>
        ) : (
          <div className="flex flex-col gap-2">
            {categoryState.categories.map(category => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-md border border-ui-border-base p-4"
              >
                <div className="flex flex-col">
                  <Text className="font-semibold">
                    {formatCategoryLabel(category)}
                  </Text>
                  <Text size="small" className="text-ui-fg-muted">
                    {category.description ?? "No description"}
                  </Text>
                  {category.config ? (
                    <div className="mt-2 flex gap-2">
                      <Badge color="green">Custom layout</Badge>
                      <Badge variant="secondary">
                        {category.config.layout === "thumbnail-grid"
                          ? "Thumbnail grid"
                          : "Default"}
                      </Badge>
                    </div>
                  ) : (
                    <Badge className="mt-2" variant="secondary">
                      Inherits global configuration
                    </Badge>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => openCategoryModal(category)}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
        )}
      </Container>

      <FocusModal open={categoryModal.open} onOpenChange={open => !open && closeCategoryModal()}>
        <FocusModal.Content className="max-h-[90vh] w-[720px]">
          <FocusModal.Header>
            <div className="flex flex-col gap-1">
              <Heading>
                {categoryModal.category
                  ? `Mega Menu · ${formatCategoryLabel(categoryModal.category)}`
                  : "Category Mega Menu"}
              </Heading>
              {categoryModal.category?.parent_category_id ? (
                <Text size="small" className="text-ui-fg-muted">
                  Parent: {categoryModal.category.parent_category_id}
                </Text>
              ) : null}
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            {categoryModal.loading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Text className="font-semibold">Layout</Text>
                  <div className="flex gap-2">
                    {AVAILABLE_LAYOUTS.map(layout => (
                      <Button
                        key={layout}
                        variant={
                          categoryModal.draft.layout === layout
                            ? "primary"
                            : "secondary"
                        }
                        size="small"
                        onClick={() => handleCategoryDraftChange("layout", layout)}
                      >
                        {layout === "thumbnail-grid" ? "Thumbnail grid" : "Default"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Text className="font-semibold">Tagline</Text>
                  <Input
                    value={categoryModal.draft.tagline}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleCategoryDraftChange("tagline", event.target.value)
                    }
                    placeholder="Optional category-specific tagline"
                  />
                </div>

                <div className="grid gap-2">
                  <Text className="font-semibold">Submenu items</Text>
                  <Select
                    onValueChange={value => {
                      handleAddSubmenuCategory(value)
                    }}
                    disabled={categoryOptions.length === 0}
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
                  {selectedSubmenuEntries.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSubmenuEntries.map(entry => (
                        <Badge
                          key={entry.id}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          {entry.label}
                          <button
                            type="button"
                            className="rounded-full px-1.5 py-0.5 text-xs font-semibold text-ui-fg-muted transition-colors hover:text-ui-fg-base"
                            onClick={() => handleRemoveSubmenuCategory(entry.id)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Text size="small" className="text-ui-fg-muted">
                      Use the dropdown to add submenu categories. Items will be deduplicated in display order.
                    </Text>
                  )}
                </div>

                <div className="grid gap-2">
                  <Text className="font-semibold">Columns JSON</Text>
                  <Textarea
                    value={categoryModal.draft.columnsText}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleCategoryDraftChange("columnsText", event.target.value)
                    }
                    placeholder="[{\n  \"heading\": \"Column\",\n  \"items\": []\n}]"
                    rows={8}
                  />
                  <Text size="small" className="text-ui-fg-muted">
                    Columns override automatically generated submenu items. Include optional categoryId fields to auto-populate labels and links.
                  </Text>
                </div>

                <div className="grid gap-2">
                  <Text className="font-semibold">Featured JSON</Text>
                  <Textarea
                    value={categoryModal.draft.featuredText}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleCategoryDraftChange("featuredText", event.target.value)
                    }
                    rows={6}
                  />
                </div>

                <div className="grid gap-2">
                  <Text className="font-semibold">Preview</Text>
                  <Textarea value={categoryPreviewJson} readOnly rows={10} />
                </div>
              </div>
            )}
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex flex-1 items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleResetCategoryDraft}
                disabled={categoryModal.loading}
              >
                Reset draft
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleDeleteCategoryConfig()}
                disabled={
                  categoryModal.loading ||
                  categoryModal.saving ||
                  !categoryModal.config
                }
              >
                Remove configuration
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeCategoryModal}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveCategory()}
                loading={categoryModal.saving}
                disabled={categoryModal.loading}
              >
                Save category configuration
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Mega Menu",
  icon: LayoutGrid
})

export default MegaMenuPage
