import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SquaresPlus } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  FocusModal,
  Heading,
  Input,
  Select,
  Skeleton,
  Text,
  toast
} from "@medusajs/ui"
import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import type {
  CategoryRepresentationMode,
  CategorySelectorConfigDTO,
  CategorySelectorPresentationConfig,
  CategorySelectorScaleMode,
  CategorySelectorStyle
} from "../../../../modules/category-selector-by-product"
import { DEFAULT_CATEGORY_SELECTOR_PRESENTATION } from "../../../../modules/category-selector-by-product/types"

type ResolvedImage = {
  id: string
  url: string | null
  alt_text: string | null
}

type CategoryRow = {
  id: string
  name: string
  handle: string | null
  description: string | null
  parent_category_id: string | null
  config: CategorySelectorConfigDTO & {
    random_product_ids: string[]
  }
  resolvedProduct: ProductImageSummary | null
  resolvedImage: ResolvedImage | null
  resolvedPool: ProductImageSummary[]
}

type CategorySelectorAdminResponse = {
  categories: Array<
    {
      id: string
      name: string
      handle: string | null
      description: string | null
      parent_category_id: string | null
      config: CategorySelectorConfigDTO & {
        random_product_ids: string[]
      }
      resolved_product: ProductImageSummary | null
      resolved_image: ResolvedImage | null
      resolved_pool: ProductImageSummary[]
    }
  >
  availableModes: CategoryRepresentationMode[]
  total: number
  presentation: CategorySelectorPresentationConfig
}

type ProductImageSummary = {
  id: string
  title: string
  handle: string | null
  description: string | null
  thumbnail: string | null
  images: Array<{
    id: string
    url: string | null
    alt_text?: string | null
    metadata?: Record<string, unknown> | null
  }>
}

type ProductListResponse = {
  category_id: string
  products: ProductImageSummary[]
  count: number
  limit: number
  offset: number
}

type CategoryUpdateResponse = {
  category_id: string
  config: CategorySelectorConfigDTO & {
    random_product_ids: string[]
  }
  resolved_product: ProductImageSummary | null
  resolved_image: ResolvedImage | null
  resolved_pool: ProductImageSummary[]
}

type PageState = {
  loading: boolean
  error: string | null
  categories: CategoryRow[]
  availableModes: CategoryRepresentationMode[]
  globalPresentation: CategorySelectorPresentationConfig
}

type ProductModalState = {
  open: boolean
  category: CategoryRow | null
  searchInput: string
  query: string
  loading: boolean
  products: ProductImageSummary[]
  selectedProductId: string | null
  selectedImageId: string | null
  error: string | null
  saving: boolean
}

type RandomModalState = {
  open: boolean
  category: CategoryRow | null
  searchInput: string
  query: string
  loading: boolean
  products: ProductImageSummary[]
  selectedProductIds: string[]
  error: string | null
  saving: boolean
}

const MODE_LABELS: Record<CategoryRepresentationMode, string> = {
  custom_image: "Custom image placeholder",
  product_image: "Specific product image",
  random_product: "Random product pool"
}

const MODE_DESCRIPTIONS: Record<CategoryRepresentationMode, string> = {
  custom_image:
    "Reserve a slot for a custom image. We'll enable uploads once storage is configured.",
  product_image:
    "Choose one product and one of its images to represent this category.",
  random_product:
    "Rotate between a curated list of products from this category."
}

type ScaleModeOption = {
  value: CategorySelectorScaleMode
  label: string
  helper?: string
}

type StyleOption = {
  value: CategorySelectorStyle
  label: string
  helper?: string
}

const SCALE_MODE_OPTIONS: ScaleModeOption[] = [
  {
    value: "cover",
    label: "Cover",
    helper: "Fill the container while cropping overflow on the long axis."
  },
  {
    value: "fit_width",
    label: "Fit width",
    helper: "Scale until the image spans the full width; height may vary."
  },
  {
    value: "fit_height",
    label: "Fit height",
    helper: "Scale until the image spans the full height; width may vary."
  },
  {
    value: "shortest_side",
    label: "Shortest side",
    helper: "Scale until the shortest edge matches the container, preserving aspect ratio."
  },
  {
    value: "longest_side",
    label: "Longest side",
    helper: "Scale until the longest edge matches the container, preventing cropping."
  }
]

const STYLE_OPTIONS: StyleOption[] = [
  {
    value: "grid",
    label: "Grid",
    helper: "Arrange images in a tidy grid with consistent gutters."
  },
  {
    value: "carousel",
    label: "Carousel",
    helper: "Cycle through images horizontally with paging controls."
  },
  {
    value: "edge_to_edge",
    label: "Edge to edge",
    helper: "Stretch content to the viewport edges for immersive hero sections."
  },
  {
    value: "square",
    label: "Square",
    helper: "Force square aspect tiles regardless of source dimensions."
  },
  {
    value: "flips",
    label: "Flip cards",
    helper: "Flip cards on hover or timer to reveal secondary content."
  }
]

const presentationEquals = (
  a: CategorySelectorPresentationConfig,
  b: CategorySelectorPresentationConfig
): boolean =>
  a.enabled === b.enabled &&
  a.scale_mode === b.scale_mode &&
  a.style === b.style &&
  (a.max_rows ?? null) === (b.max_rows ?? null) &&
  (a.max_columns ?? null) === (b.max_columns ?? null) &&
  a.randomize_visible_categories === b.randomize_visible_categories

const toInputValue = (value: number | null): string =>
  typeof value === "number" && !Number.isNaN(value) ? String(value) : ""

const parseDimension = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed.length) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

const DEFAULT_PAGE_STATE: PageState = {
  loading: true,
  error: null,
  categories: [],
  availableModes: ["custom_image", "product_image", "random_product"],
  globalPresentation: { ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION }
}

const createProductModalState = (): ProductModalState => ({
  open: false,
  category: null,
  searchInput: "",
  query: "",
  loading: false,
  products: [],
  selectedProductId: null,
  selectedImageId: null,
  error: null,
  saving: false
})

const createRandomModalState = (): RandomModalState => ({
  open: false,
  category: null,
  searchInput: "",
  query: "",
  loading: false,
  products: [],
  selectedProductIds: [],
  error: null,
  saving: false
})

const ensureArray = (value: string[] | null | undefined): string[] =>
  Array.isArray(value) ? value : []

const fetchInitWithJson = (
  init?: RequestInit & { skipJsonHeader?: boolean }
): RequestInit => {
  if (!init) {
    return {
      headers: {
        Accept: "application/json"
      }
    }
  }

  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")

  if (!init.skipJsonHeader && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  return {
    ...init,
    headers
  }
}

const CategorySelectorPage = () => {
  const [state, setState] = useState<PageState>(DEFAULT_PAGE_STATE)
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [globalDraft, setGlobalDraft] = useState<
    CategorySelectorPresentationConfig
  >({ ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION })
  const [productModal, setProductModal] = useState<ProductModalState>(
    createProductModalState
  )
  const [randomModal, setRandomModal] = useState<RandomModalState>(
    createRandomModalState
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
      .catch(() => ({ message: "Unable to parse server response" }))

    if (!response.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : `Request failed with status ${response.status}`
      throw new Error(message)
    }

    return data as T
  }, [])

  const updateCategoryEntry = useCallback(
    (
      categoryId: string,
      updater: (category: CategoryRow) => CategoryRow
    ) => {
      setState(prev => ({
        ...prev,
        categories: prev.categories.map(category =>
          category.id === categoryId ? updater(category) : category
        )
      }))
    },
    []
  )

  const loadCategories = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const data = await fetchJson<CategorySelectorAdminResponse>(
        "/admin/category-selector-by-product"
      )

      const normalizedPresentation =
        data.presentation ?? DEFAULT_CATEGORY_SELECTOR_PRESENTATION

      setState({
        loading: false,
        error: null,
        categories: data.categories.map(category => ({
          id: category.id,
          name: category.name,
          handle: category.handle,
          description: category.description,
          parent_category_id: category.parent_category_id,
          config: {
            ...category.config,
            random_product_ids: ensureArray(
              category.config.random_product_ids
            )
          },
          resolvedProduct: category.resolved_product ?? null,
          resolvedImage: category.resolved_image ?? null,
          resolvedPool: Array.isArray(category.resolved_pool)
            ? category.resolved_pool
            : []
        })),
        availableModes: data.availableModes,
        globalPresentation: {
          ...normalizedPresentation
        }
      })
      setGlobalDraft({ ...normalizedPresentation })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load category selector settings."
      }))
    }
  }, [fetchJson])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const handleResetGlobal = useCallback(() => {
    setGlobalDraft({ ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION })
  }, [])

  const saveGlobalPresentationSettings = useCallback(async () => {
    if (presentationEquals(globalDraft, state.globalPresentation)) {
      toast.info("No layout changes to save.")
      return
    }

    setSavingGlobal(true)

    try {
      const data = await fetchJson<{
        presentation: CategorySelectorPresentationConfig
      }>("/admin/category-selector-by-product/settings", {
        method: "PUT",
        body: JSON.stringify({
          presentation: globalDraft
        })
      })

      setState(prev => ({
        ...prev,
        globalPresentation: { ...data.presentation },
        categories: prev.categories.map(category => ({
          ...category,
          config: {
            ...category.config,
            presentation: { ...data.presentation }
          }
        }))
      }))

      setGlobalDraft({ ...data.presentation })

      toast.success("Updated global navigation layout settings.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update global navigation layout settings."
      )
    } finally {
      setSavingGlobal(false)
    }
  }, [fetchJson, globalDraft, state.globalPresentation])

  const saveCustomImageMode = useCallback(
    async (category: CategoryRow) => {
      setSavingCategoryId(category.id)
      try {
        const data = await fetchJson<CategoryUpdateResponse>(
          `/admin/category-selector-by-product/${category.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              mode: "custom_image",
              custom_image_url: category.config.custom_image_url ?? null
            })
          }
        )

        updateCategoryEntry(category.id, existing => ({
          ...existing,
          config: {
            ...data.config,
            random_product_ids: ensureArray(data.config.random_product_ids)
          },
          resolvedProduct: data.resolved_product ?? null,
          resolvedImage: data.resolved_image ?? null,
          resolvedPool: Array.isArray(data.resolved_pool)
            ? data.resolved_pool
            : []
        }))
        toast.success(
          `${category.name} now uses the custom image placeholder.`
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update category mode."
        )
      } finally {
        setSavingCategoryId(null)
      }
    },
    [fetchJson, updateCategoryEntry]
  )

  const loadProductModalProducts = useCallback(
    async (categoryId: string, search?: string) => {
      setProductModal(prev => ({
        ...prev,
        loading: true,
        error: null,
        query: search ?? prev.query
      }))

      try {
        const query = search?.trim().length ? search.trim() : undefined
        const params = new URLSearchParams({ limit: "100" })
        if (query) {
          params.set("q", query)
        }

        const endpoint = `/admin/category-selector-by-product/${categoryId}/products?${params.toString()}`

        const data = await fetchJson<ProductListResponse>(endpoint)

        setProductModal(prev => ({
          ...prev,
          loading: false,
          products: data.products,
          query: query ?? ""
        }))
      } catch (error) {
        setProductModal(prev => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load products for this category."
        }))
      }
    },
    [fetchJson]
  )

  const loadRandomModalProducts = useCallback(
    async (categoryId: string, search?: string) => {
      setRandomModal(prev => ({
        ...prev,
        loading: true,
        error: null,
        query: search ?? prev.query
      }))

      try {
        const query = search?.trim().length ? search.trim() : undefined
        const params = new URLSearchParams({ limit: "100" })
        if (query) {
          params.set("q", query)
        }

        const endpoint = `/admin/category-selector-by-product/${categoryId}/products?${params.toString()}`

        const data = await fetchJson<ProductListResponse>(endpoint)

        setRandomModal(prev => ({
          ...prev,
          loading: false,
          products: data.products,
          query: query ?? ""
        }))
      } catch (error) {
        setRandomModal(prev => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load products for this category."
        }))
      }
    },
    [fetchJson]
  )

  const closeProductModal = useCallback(() => {
    setProductModal(createProductModalState())
  }, [])

  const closeRandomModal = useCallback(() => {
    setRandomModal(createRandomModalState())
  }, [])

  const openProductModal = useCallback(
    (category: CategoryRow) => {
      setProductModal({
        open: true,
        category,
        searchInput: "",
        query: "",
        loading: true,
        products: [],
        selectedProductId: category.config.selected_product_id ?? null,
        selectedImageId: category.config.selected_product_image_id ?? null,
        error: null,
        saving: false
      })

      void loadProductModalProducts(category.id)
    },
    [loadProductModalProducts]
  )

  const openRandomModal = useCallback(
    (category: CategoryRow) => {
      setRandomModal({
        open: true,
        category,
        searchInput: "",
        query: "",
        loading: true,
        products: [],
        selectedProductIds: ensureArray(
          category.config.random_product_ids
        ),
        error: null,
        saving: false
      })

      void loadRandomModalProducts(category.id)
    },
    [loadRandomModalProducts]
  )

  const handleModeChange = useCallback(
    (category: CategoryRow, mode: CategoryRepresentationMode) => {
      if (mode === category.config.mode) {
        return
      }

      if (mode === "custom_image") {
        void saveCustomImageMode(category)
        return
      }

      if (mode === "product_image") {
        openProductModal(category)
        return
      }

      if (mode === "random_product") {
        openRandomModal(category)
      }
    },
    [openProductModal, openRandomModal, saveCustomImageMode]
  )

  const selectedRandomProducts = useMemo(() => {
    if (!randomModal.selectedProductIds.length) {
      return []
    }

    const lookup = new Set(randomModal.selectedProductIds)

    return randomModal.products.filter(product => lookup.has(product.id))
  }, [randomModal.products, randomModal.selectedProductIds])

  const handleProductModalSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!productModal.category) {
        return
      }

      void loadProductModalProducts(
        productModal.category.id,
        productModal.searchInput
      )
    },
    [productModal.category, productModal.searchInput, loadProductModalProducts]
  )

  const handleRandomModalSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!randomModal.category) {
        return
      }

      void loadRandomModalProducts(
        randomModal.category.id,
        randomModal.searchInput
      )
    },
    [randomModal.category, randomModal.searchInput, loadRandomModalProducts]
  )

  const saveProductSelection = useCallback(async () => {
    if (
      !productModal.category ||
      !productModal.selectedProductId ||
      !productModal.selectedImageId
    ) {
      setProductModal(prev => ({
        ...prev,
        error: "Pick a product and one of its images to continue."
      }))
      return
    }

    setProductModal(prev => ({
      ...prev,
      saving: true,
      error: null
    }))

    try {
      const data = await fetchJson<CategoryUpdateResponse>(
        `/admin/category-selector-by-product/${productModal.category.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            mode: "product_image",
            selected_product_id: productModal.selectedProductId,
            selected_product_image_id: productModal.selectedImageId
          })
        }
      )

      updateCategoryEntry(productModal.category.id, existing => ({
        ...existing,
        config: {
          ...data.config,
          random_product_ids: ensureArray(data.config.random_product_ids)
        },
        resolvedProduct: data.resolved_product ?? null,
        resolvedImage: data.resolved_image ?? null,
        resolvedPool: Array.isArray(data.resolved_pool)
          ? data.resolved_pool
          : []
      }))
      toast.success(
        `Updated ${productModal.category.name} to use a specific product image.`
      )
      closeProductModal()
    } catch (error) {
      setProductModal(prev => ({
        ...prev,
        saving: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save the product selection."
      }))
    }
  }, [
    productModal.category,
    productModal.selectedProductId,
    productModal.selectedImageId,
    fetchJson,
    updateCategoryEntry,
    closeProductModal
  ])

  const saveRandomSelection = useCallback(async () => {
    if (!randomModal.category) {
      return
    }

    setRandomModal(prev => ({
      ...prev,
      saving: true,
      error: null
    }))

    try {
      const data = await fetchJson<CategoryUpdateResponse>(
        `/admin/category-selector-by-product/${randomModal.category.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            mode: "random_product",
            random_product_ids: randomModal.selectedProductIds
          })
        }
      )

      updateCategoryEntry(randomModal.category.id, existing => ({
        ...existing,
        config: {
          ...data.config,
          random_product_ids: ensureArray(data.config.random_product_ids)
        },
        resolvedProduct: data.resolved_product ?? null,
        resolvedImage: data.resolved_image ?? null,
        resolvedPool: Array.isArray(data.resolved_pool)
          ? data.resolved_pool
          : []
      }))
      toast.success(
        `Updated ${randomModal.category.name} to rotate between ${ensureArray(
          data.config.random_product_ids
        ).length} products.`
      )
      closeRandomModal()
    } catch (error) {
      setRandomModal(prev => ({
        ...prev,
        saving: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save the random pool selection."
      }))
    }
  }, [
    randomModal.category,
    randomModal.selectedProductIds,
    fetchJson,
    updateCategoryEntry,
    closeRandomModal
  ])

  const renderCategoryList = () => {
    if (state.loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      )
    }

    if (state.error) {
      return (
        <div className="rounded-md border border-ui-border-strong bg-ui-bg-component px-4 py-3">
          <Text size="small" className="text-ui-fg-error">
            {state.error}
          </Text>
          <div className="mt-2">
            <Button size="small" onClick={() => void loadCategories()}>
              Try again
            </Button>
          </div>
        </div>
      )
    }

    if (!state.categories.length) {
      return (
        <div className="rounded-md border border-dashed border-ui-border-strong bg-ui-bg-component px-4 py-6 text-center">
          <Text size="small" className="text-ui-fg-muted">
            No top-level categories were found. Create a category to get started.
          </Text>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {state.categories.map(category => (
          <div
            key={category.id}
            className="rounded-lg border border-ui-border-base bg-ui-bg-component p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Heading level="h3" className="text-lg">
                  {category.name}
                </Heading>
                <Text size="small" className="text-ui-fg-muted">
                  {category.handle ? `/${category.handle}` : "No handle"}
                </Text>
                {category.description ? (
                  <Text size="small" className="mt-2 text-ui-fg-subtle">
                    {category.description}
                  </Text>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Badge color="neutral" size="small">
                  {MODE_LABELS[category.config.mode]}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,320px)_1fr]">
              <div className="grid gap-2">
                <LabelledSelect
                  category={category}
                  availableModes={state.availableModes}
                  onChange={mode => handleModeChange(category, mode)}
                  disabled={savingCategoryId === category.id}
                />
                <Text size="small" className="text-ui-fg-muted">
                  {MODE_DESCRIPTIONS[category.config.mode]}
                </Text>
              </div>

              <ModeDetails
                category={category}
                onConfigureProduct={() => openProductModal(category)}
                onConfigureRandom={() => openRandomModal(category)}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Container className="space-y-6 px-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading level="h1" className="text-2xl">
            Category Nav Images
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Control how each top-level category is represented across the storefront hero and navigation modules.
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => void loadCategories()}
          disabled={state.loading}
        >
          Refresh
        </Button>
      </div>

      <GlobalPresentationSection
        draft={globalDraft}
        baseline={state.globalPresentation}
        setDraft={setGlobalDraft}
        onReset={handleResetGlobal}
        onSave={saveGlobalPresentationSettings}
        saving={savingGlobal}
        disabled={state.loading}
      />

      {renderCategoryList()}

      <ProductSelectionModal
        modalState={productModal}
        onOpenChange={isOpen => {
          if (!isOpen) {
            closeProductModal()
          }
        }}
        setModalState={setProductModal}
        onSearch={handleProductModalSearch}
        onSave={saveProductSelection}
      />

      <RandomPoolModal
        modalState={randomModal}
        onOpenChange={isOpen => {
          if (!isOpen) {
            closeRandomModal()
          }
        }}
        setModalState={setRandomModal}
        onSearch={handleRandomModalSearch}
        onSave={saveRandomSelection}
        selectedProducts={selectedRandomProducts}
      />
    </Container>
  )
}

type LabelledSelectProps = {
  category: CategoryRow
  availableModes: CategoryRepresentationMode[]
  onChange: (mode: CategoryRepresentationMode) => void
  disabled?: boolean
}

type GlobalPresentationSectionProps = {
  draft: CategorySelectorPresentationConfig
  baseline: CategorySelectorPresentationConfig
  setDraft: Dispatch<SetStateAction<CategorySelectorPresentationConfig>>
  onReset: () => void
  onSave: () => Promise<void> | void
  saving: boolean
  disabled?: boolean
}

const GlobalPresentationSection = ({
  draft,
  baseline,
  setDraft,
  onReset,
  onSave,
  saving,
  disabled
}: GlobalPresentationSectionProps) => {
  const dirty = useMemo(
    () => !presentationEquals(draft, baseline),
    [draft, baseline]
  )

  const resetDisabled = useMemo(
    () => presentationEquals(draft, DEFAULT_CATEGORY_SELECTOR_PRESENTATION),
    [draft]
  )

  const handleScaleChange = useCallback(
    (value: string) => {
      setDraft(prev => ({
        ...prev,
        scale_mode: value as CategorySelectorScaleMode
      }))
    },
    [setDraft]
  )

  const handleStyleChange = useCallback(
    (value: string) => {
      setDraft(prev => ({
        ...prev,
        style: value as CategorySelectorStyle
      }))
    },
    [setDraft]
  )

  const handleDimensionChange = useCallback(
    (field: "max_rows" | "max_columns") =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setDraft(prev => ({
          ...prev,
          [field]: parseDimension(event.target.value)
        }))
      },
    [setDraft]
  )

  const handleCheckboxChange = useCallback(
    (field: "enabled" | "randomize_visible_categories") =>
      (value: boolean | "indeterminate") => {
        setDraft(prev => ({
          ...prev,
          [field]: value === true
        }))
      },
    [setDraft]
  )

  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-component p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level="h2" className="text-xl">
            Display configuration
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Control how category tiles render across navigation and hero placements.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={onReset}
            disabled={saving || disabled || resetDisabled}
          >
            Reset to defaults
          </Button>
          <Button
            size="small"
            onClick={() => void onSave()}
            disabled={!dirty || saving || disabled}
          >
            Save layout
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-md border border-ui-border-base bg-ui-bg-base p-3">
          <Checkbox
            checked={draft.enabled}
            onCheckedChange={handleCheckboxChange("enabled")}
            disabled={disabled || saving}
          />
          <div>
            <Text size="small" className="font-medium text-ui-fg-subtle">
              Enabled
            </Text>
            <Text size="small" className="text-ui-fg-muted">
              Disable to temporarily hide category tiles while retaining configuration.
            </Text>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-ui-border-base bg-ui-bg-base p-3">
          <Checkbox
            checked={draft.randomize_visible_categories}
            onCheckedChange={handleCheckboxChange(
              "randomize_visible_categories"
            )}
            disabled={disabled || saving}
          />
          <div>
            <Text size="small" className="font-medium text-ui-fg-subtle">
              Randomise visible categories
            </Text>
            <Text size="small" className="text-ui-fg-muted">
              Rotate the category order per page view for a varied navigation.
            </Text>
          </div>
        </label>

        <div className="space-y-2">
          <div className="grid gap-1">
            <Text size="small" className="font-medium text-ui-fg-subtle">
              Scale & resize
            </Text>
            <Select
              value={draft.scale_mode}
              onValueChange={handleScaleChange}
              disabled={disabled || saving}
            >
              <Select.Trigger id="global-scale-mode">
                <Select.Value placeholder="Choose how images should scale" />
              </Select.Trigger>
              <Select.Content>
                {SCALE_MODE_OPTIONS.map(option => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            {
              SCALE_MODE_OPTIONS.find(option => option.value === draft.scale_mode)
                ?.helper ?? ""
            }
          </Text>
        </div>

        <div className="space-y-2">
          <div className="grid gap-1">
            <Text size="small" className="font-medium text-ui-fg-subtle">
              Style
            </Text>
            <Select
              value={draft.style}
              onValueChange={handleStyleChange}
              disabled={disabled || saving}
            >
              <Select.Trigger id="global-style">
                <Select.Value placeholder="Select a presentation style" />
              </Select.Trigger>
              <Select.Content>
                {STYLE_OPTIONS.map(option => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            {
              STYLE_OPTIONS.find(option => option.value === draft.style)?.helper ??
              ""
            }
          </Text>
        </div>

        <div className="space-y-2">
          <div className="grid gap-1">
            <Text size="small" className="font-medium text-ui-fg-subtle">
              Max rows
            </Text>
            <Input
              type="number"
              min={0}
              value={toInputValue(draft.max_rows)}
              onChange={handleDimensionChange("max_rows")}
              placeholder="Auto"
              disabled={disabled || saving}
            />
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Leave blank for automatic sizing or set a positive number to clamp rows.
          </Text>
        </div>

        <div className="space-y-2">
          <div className="grid gap-1">
            <Text size="small" className="font-medium text-ui-fg-subtle">
              Max columns
            </Text>
            <Input
              type="number"
              min={0}
              value={toInputValue(draft.max_columns)}
              onChange={handleDimensionChange("max_columns")}
              placeholder="Auto"
              disabled={disabled || saving}
            />
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Leave blank for automatic sizing or set a positive number to clamp columns.
          </Text>
        </div>
      </div>
    </div>
  )
}

const LabelledSelect = ({
  category,
  availableModes,
  onChange,
  disabled
}: LabelledSelectProps) => {
  return (
    <div className="grid gap-1">
      <Text size="small" className="font-medium text-ui-fg-subtle">
        Representation mode
      </Text>
      <Select
        value={category.config.mode}
        onValueChange={value => onChange(value as CategoryRepresentationMode)}
        disabled={disabled}
      >
        <Select.Trigger id={`${category.id}-mode-select`}>
          <Select.Value placeholder="Choose how this category should look" />
        </Select.Trigger>
        <Select.Content>
          {availableModes.map(mode => (
            <Select.Item key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  )
}

type ModeDetailsProps = {
  category: CategoryRow
  onConfigureProduct: () => void
  onConfigureRandom: () => void
}

const ModeDetails = ({
  category,
  onConfigureProduct,
  onConfigureRandom
}: ModeDetailsProps) => {
  if (category.config.mode === "product_image") {
    const hasSelection = Boolean(category.resolvedProduct)
    const displayImage =
      category.resolvedImage?.url || category.resolvedProduct?.thumbnail || null

    return (
      <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
          <div className="space-y-2">
            <Text size="small" className="font-medium">
              Selected product
            </Text>
            {hasSelection ? (
              <div className="space-y-1">
                <Text size="small" className="font-medium text-ui-fg-subtle">
                  {category.resolvedProduct?.title ?? "Unknown product"}
                </Text>
                <Text size="small" className="text-ui-fg-muted">
                  {category.resolvedProduct?.handle
                    ? `/${category.resolvedProduct.handle}`
                    : "No handle"}
                </Text>
                {category.resolvedImage?.alt_text ? (
                  <Text size="small" className="text-ui-fg-muted">
                    {category.resolvedImage.alt_text}
                  </Text>
                ) : null}
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-muted">
                No product image selected yet.
              </Text>
            )}
            <Button
              variant="secondary"
              size="small"
              onClick={onConfigureProduct}
            >
              {hasSelection ? "Update selection" : "Choose product image"}
            </Button>
          </div>
          <div className="flex min-h-[140px] items-center justify-center rounded-md border border-dashed border-ui-border-base bg-ui-bg-base p-2">
            {displayImage ? (
              <img
                src={displayImage}
                alt={category.resolvedImage?.alt_text ?? "Selected product"}
                className="h-40 w-full max-w-xs rounded-md object-cover"
              />
            ) : (
              <Text size="small" className="text-ui-fg-muted text-center">
                Preview will appear here once a product image is chosen.
              </Text>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (category.config.mode === "random_product") {
    const poolSize = ensureArray(category.config.random_product_ids).length
    const thumbnails = category.resolvedPool.slice(0, 6)
    const remaining = poolSize - thumbnails.length
    return (
      <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
          <div className="space-y-2">
            <Text size="small" className="font-medium">
              Random pool
            </Text>
            <Text size="small" className="text-ui-fg-muted">
              {poolSize > 0
                ? `${poolSize} product${poolSize === 1 ? "" : "s"} selected for rotation.`
                : "No products selected yet. The storefront will skip this category until a pool is configured."}
            </Text>
            <Button
              variant="secondary"
              size="small"
              onClick={onConfigureRandom}
            >
              {poolSize > 0 ? "Manage pool" : "Build pool"}
            </Button>
          </div>
          <div className="grid min-h-[140px] grid-cols-3 gap-2">
            {thumbnails.length ? (
              <>
                {thumbnails.map(product => (
                  <div
                    key={product.id}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base"
                  >
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Text size="small" className="text-center text-ui-fg-muted px-2">
                        {product.title}
                      </Text>
                    )}
                  </div>
                ))}
                {remaining > 0 ? (
                  <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-ui-border-base bg-ui-bg-base">
                    <Text size="small" className="text-ui-fg-muted">
                      +{remaining}
                    </Text>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="col-span-3 flex items-center justify-center rounded-md border border-dashed border-ui-border-base bg-ui-bg-base px-4 text-center">
                <Text size="small" className="text-ui-fg-muted">
                  Selected products will appear here.
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const customImageUrl = category.config.custom_image_url

  return (
    <div className="rounded-md border border-dashed border-ui-border-base bg-ui-bg-subtle p-3">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
        <div className="space-y-2">
          <Text size="small" className="font-medium">
            Custom image placeholder
          </Text>
          <Text size="small" className="text-ui-fg-muted">
            We'll wire up uploads after the storage service is ready. For now, the storefront will display a neutral placeholder.
          </Text>
        </div>
        <div className="flex min-h-[140px] items-center justify-center rounded-md border border-dashed border-ui-border-base bg-ui-bg-base p-2">
          {customImageUrl ? (
            <img
              src={customImageUrl}
              alt="Custom category"
              className="h-40 w-full max-w-xs rounded-md object-cover"
            />
          ) : (
            <Text size="small" className="text-ui-fg-muted text-center">
              Once an image is uploaded, a preview will appear here.
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

type ProductSelectionModalProps = {
  modalState: ProductModalState
  onOpenChange: (open: boolean) => void
  setModalState: Dispatch<SetStateAction<ProductModalState>>
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  onSave: () => void
}

const ProductSelectionModal = ({
  modalState,
  onOpenChange,
  setModalState,
  onSearch,
  onSave
}: ProductSelectionModalProps) => {
  const selectedProduct = useMemo(() => {
    if (!modalState.selectedProductId) {
      return null
    }

    return (
      modalState.products.find(product => product.id === modalState.selectedProductId) ??
      null
    )
  }, [modalState.products, modalState.selectedProductId])

  return (
    <FocusModal open={modalState.open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="max-w-4xl">
        <FocusModal.Header className="gap-1">
          <Heading level="h2" className="text-xl">
            Choose a product image
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Pick a product from this category, then select one of its images to feature.
          </Text>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4">
          {modalState.category ? (
            <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
              <Text size="small" className="font-medium">
                {modalState.category.name}
              </Text>
              <Text size="small" className="text-ui-fg-muted">
                {modalState.category.handle ? `/${modalState.category.handle}` : modalState.category.id}
              </Text>
            </div>
          ) : null}

          <form className="flex gap-2" onSubmit={onSearch}>
            <Input
              placeholder="Search products in this category"
              value={modalState.searchInput}
              onChange={event =>
                setModalState(prev => ({
                  ...prev,
                  searchInput: event.target.value
                }))
              }
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {modalState.error ? (
            <Text size="small" className="text-ui-fg-error">
              {modalState.error}
            </Text>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Text size="small" className="font-medium text-ui-fg-subtle">
                Products
              </Text>
              <div className="h-64 overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-2">
                {modalState.loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Text size="small" className="text-ui-fg-muted">
                      Loading products…
                    </Text>
                  </div>
                ) : modalState.products.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      No products match this search.
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modalState.products.map(product => {
                      const isSelected = product.id === modalState.selectedProductId
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() =>
                            setModalState(prev => ({
                              ...prev,
                              selectedProductId: product.id,
                              selectedImageId:
                                prev.selectedProductId === product.id
                                  ? prev.selectedImageId
                                  : product.images[0]?.id ?? null
                            }))
                          }
                          className={`w-full rounded-md border px-3 py-2 text-left transition ${
                            isSelected
                              ? "border-ui-border-strong bg-ui-bg-base"
                              : "border-transparent hover:border-ui-border-base hover:bg-ui-bg-component"
                          }`}
                        >
                          <Text size="small" className="font-medium">
                            {product.title}
                          </Text>
                          <Text size="small" className="text-ui-fg-muted">
                            {product.handle ? `/${product.handle}` : product.id}
                          </Text>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Text size="small" className="font-medium text-ui-fg-subtle">
                Images
              </Text>
              <div className="h-64 overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                {!selectedProduct ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      Choose a product to view its images.
                    </Text>
                  </div>
                ) : selectedProduct.images.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      This product has no images.
                    </Text>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProduct.images.map(image => {
                      const isSelected = image.id === modalState.selectedImageId
                      return (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() =>
                            setModalState(prev => ({
                              ...prev,
                              selectedImageId: image.id
                            }))
                          }
                          className={`flex flex-col gap-2 rounded-md border p-2 transition ${
                            isSelected
                              ? "border-ui-border-strong bg-ui-bg-base"
                              : "border-transparent hover:border-ui-border-base hover:bg-ui-bg-component"
                          }`}
                        >
                          <div className="relative aspect-square overflow-hidden rounded-sm bg-ui-bg-component">
                            {image.url ? (
                              <img
                                src={image.url}
                                alt="Product"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Text size="small" className="text-ui-fg-muted">
                                  Missing image
                                </Text>
                              </div>
                            )}
                          </div>
                          <Text size="small" className="text-ui-fg-muted">
                            {image.id}
                          </Text>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {modalState.error ? (
            <Text size="small" className="text-ui-fg-error">
              {modalState.error}
            </Text>
          ) : null}
          <div className="flex flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={modalState.saving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={modalState.saving}
              isLoading={modalState.saving}
            >
              Save selection
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

type RandomPoolModalProps = {
  modalState: RandomModalState
  onOpenChange: (open: boolean) => void
  setModalState: Dispatch<SetStateAction<RandomModalState>>
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  onSave: () => void
  selectedProducts: ProductImageSummary[]
}

const RandomPoolModal = ({
  modalState,
  onOpenChange,
  setModalState,
  onSearch,
  onSave,
  selectedProducts
}: RandomPoolModalProps) => {
  const missingSelections = modalState.selectedProductIds.filter(
    id => !selectedProducts.some(product => product.id === id)
  )

  return (
    <FocusModal open={modalState.open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="max-w-4xl">
        <FocusModal.Header className="gap-1">
          <Heading level="h2" className="text-xl">
            Build the random product pool
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Select one or more products that can represent this category. The storefront will rotate through them.
          </Text>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4">
          {modalState.category ? (
            <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
              <Text size="small" className="font-medium">
                {modalState.category.name}
              </Text>
              <Text size="small" className="text-ui-fg-muted">
                {modalState.category.handle ? `/${modalState.category.handle}` : modalState.category.id}
              </Text>
            </div>
          ) : null}

          <form className="flex gap-2" onSubmit={onSearch}>
            <Input
              placeholder="Search products in this category"
              value={modalState.searchInput}
              onChange={event =>
                setModalState(prev => ({
                  ...prev,
                  searchInput: event.target.value
                }))
              }
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {modalState.error ? (
            <Text size="small" className="text-ui-fg-error">
              {modalState.error}
            </Text>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Text size="small" className="font-medium text-ui-fg-subtle">
                  Products
                </Text>
                <Text size="small" className="text-ui-fg-muted">
                  {modalState.selectedProductIds.length} selected
                </Text>
              </div>
              <div className="h-64 overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-2">
                {modalState.loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Text size="small" className="text-ui-fg-muted">
                      Loading products…
                    </Text>
                  </div>
                ) : modalState.products.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      No products match this search.
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modalState.products.map(product => {
                      const checked = modalState.selectedProductIds.includes(
                        product.id
                      )
                      return (
                        <label
                          key={product.id}
                          className="flex items-start gap-3 rounded-md border border-transparent px-3 py-2 hover:border-ui-border-base hover:bg-ui-bg-component"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={value => {
                              setModalState(prev => {
                                const isChecked = value === true
                                const current = new Set(prev.selectedProductIds)
                                if (isChecked) {
                                  current.add(product.id)
                                } else {
                                  current.delete(product.id)
                                }
                                return {
                                  ...prev,
                                  selectedProductIds: Array.from(current)
                                }
                              })
                            }}
                          />
                          <div>
                            <Text size="small" className="font-medium">
                              {product.title}
                            </Text>
                            <Text size="small" className="text-ui-fg-muted">
                              {product.handle ? `/${product.handle}` : product.id}
                            </Text>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Text size="small" className="font-medium text-ui-fg-subtle">
                  Currently in pool
                </Text>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={modalState.selectedProductIds.length === 0}
                  onClick={() =>
                    setModalState(prev => ({
                      ...prev,
                      selectedProductIds: []
                    }))
                  }
                >
                  Clear
                </Button>
              </div>
              <div className="h-64 overflow-y-auto rounded-md border border-dashed border-ui-border-base bg-ui-bg-subtle p-2">
                {modalState.selectedProductIds.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      Select products from the list to add them to the rotation pool.
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedProducts.map(product => (
                      <div key={product.id} className="rounded-md border border-ui-border-base bg-ui-bg-component px-3 py-2">
                        <Text size="small" className="font-medium">
                          {product.title}
                        </Text>
                        <Text size="small" className="text-ui-fg-muted">
                          {product.handle ? `/${product.handle}` : product.id}
                        </Text>
                      </div>
                    ))}
                    {missingSelections.map(id => (
                      <div
                        key={id}
                        className="rounded-md border border-dashed border-ui-border-base bg-ui-bg-component px-3 py-2"
                      >
                        <Text size="small" className="font-medium">
                          {id}
                        </Text>
                        <Text size="small" className="text-ui-fg-muted">
                          Not in the current result set
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {modalState.error ? (
            <Text size="small" className="text-ui-fg-error">
              {modalState.error}
            </Text>
          ) : null}
          <div className="flex flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={modalState.saving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={modalState.saving}
              isLoading={modalState.saving}
            >
              Save pool
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const config = defineRouteConfig({
  label: "Category Nav Images",
  icon: SquaresPlus
})

export default CategorySelectorPage
