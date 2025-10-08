import { defineRouteConfig } from "@medusajs/admin-sdk"
import { GridList } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Text,
  toast
} from "@medusajs/ui"
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import * as LucideIcons from "lucide-react"
import type {
  MegaMenuConfigDTO,
  MegaMenuLayout
} from "../../../../modules/mega-menu"
import { COMMON_MENU_ICONS } from "../../../../modules/mega-menu/types"

type ProductImage = {
  id: string
  url: string | null
  alt_text: string | null
  metadata: Record<string, unknown> | null
}

type ProductSummary = {
  id: string
  title: string
  handle: string | null
  description: string | null
  thumbnail: string | null
  images: ProductImage[]
}

type ResolvedThumbnail = {
  id: string
  url: string | null
  alt_text: string | null
}

type ResolvedThumbnailProduct = {
  id: string
  title: string
  handle: string | null
}

type ThumbnailModalState = {
  open: boolean
  categoryId: string | null
  categoryName: string | null
  searchInput: string
  products: ProductSummary[]
  selectedProductId: string | null
  selectedImageId: string | null
  loading: boolean
  saving: boolean
  error: string | null
}

type IconModalState = {
  open: boolean
  searchInput: string
  selectedIcon: string | null
}

const MENU_LAYOUTS: { value: MegaMenuLayout; label: string; description: string }[] = [
  {
    value: "no-menu",
    label: "No Menu",
    description: "Category has no dropdown menu"
  },
  {
    value: "simple-dropdown",
    label: "Simple Dropdown",
    description: "Basic text-based dropdown list"
  },
  {
    value: "rich-columns",
    label: "Rich Columns",
    description: "Multi-column layout with images and descriptions"
  }
]

type MegaMenuDefaults = {
  defaultMenuLayout: MegaMenuLayout
  baseHref: string
}

type GlobalResponse = {
  config: MegaMenuConfigDTO | null
  defaults: MegaMenuDefaults
}

type Category = {
  id: string
  name: string
  handle: string
  description: string | null
  parent_category_id: string | null
  rank: number
}

type CategoryWithConfig = Category & {
  config: MegaMenuConfigDTO | null
  children?: CategoryWithConfig[]
  level?: number
}

type CategoryConfigResponse = {
  categoryId: string
  config: MegaMenuConfigDTO | null
  inherited: MegaMenuConfigDTO | null
  defaults: MegaMenuDefaults
  availableMenuLayouts: MegaMenuLayout[]
}

type GlobalState = {
  loading: boolean
  saving: boolean
  config: MegaMenuConfigDTO | null
  defaults: MegaMenuDefaults
  defaultMenuLayout: MegaMenuLayout
}

type CategoryState = {
  loading: boolean
  loadingCategories: boolean
  saving: boolean
  categories: CategoryWithConfig[]
  selectedCategoryId: string | null
  selectedCategory: CategoryWithConfig | null
  config: MegaMenuConfigDTO | null
  inherited: MegaMenuConfigDTO | null
  defaults: MegaMenuDefaults
  // Form fields
  menuLayout: MegaMenuLayout | null
  displayAsColumn: boolean
  columnTitle: string
  columnDescription: string
  columnImageUrl: string
  columnBadge: string
  icon: string
  thumbnailUrl: string
  title: string
  subtitle: string
  excludedFromMenu: boolean
  tagline: string
  columnsText: string
  featuredText: string
  // Thumbnail selection fields
  selectedThumbnailProductId: string | null
  selectedThumbnailImageId: string | null
  resolvedThumbnail: ResolvedThumbnail | null
  resolvedThumbnailProduct: ResolvedThumbnailProduct | null
}

// Category Tree Component
interface CategoryTreeProps {
  categories: CategoryWithConfig[]
  selectedId: string | null
  onSelect: (id: string) => void
  level?: number
}

const CategoryTreeItem = ({ category, selectedId, onSelect, level = 0 }: {
  category: CategoryWithConfig
  selectedId: string | null
  onSelect: (id: string) => void
  level?: number
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = category.children && category.children.length > 0
  const isSelected = category.id === selectedId
  const hasConfig = Boolean(category.config)

  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-x-2 py-2 px-3 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-ui-bg-base-pressed'
            : 'hover:bg-ui-bg-base-hover'
        }`}
        style={{ paddingLeft: `${(level * 16) + 12}px` }}
        onClick={() => onSelect(category.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="flex items-center justify-center w-4 h-4"
          >
            <span className="text-ui-fg-subtle">
              {isExpanded ? '▼' : '▶'}
            </span>
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <span className={`flex-1 text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
          {category.name}
        </span>
        {hasConfig && (
          <Badge size="small" color="green">Custom</Badge>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CategoryTree = ({ categories, selectedId, onSelect }: CategoryTreeProps) => {
  return (
    <div className="flex flex-col gap-y-1">
      {categories.map((category) => (
        <CategoryTreeItem
          key={category.id}
          category={category}
          selectedId={selectedId}
          onSelect={onSelect}
          level={0}
        />
      ))}
    </div>
  )
}

// DynamicIcon Component
const DynamicIcon = ({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) => {
  const IconComponent = LucideIcons[name as keyof typeof LucideIcons] as any

  if (!IconComponent || typeof IconComponent !== 'function') {
    const HelpCircleIcon = LucideIcons.HelpCircle
    return <HelpCircleIcon size={size} className={className} />
  }

  return <IconComponent size={size} className={className} />
}

// Icon Selector Modal Component
interface IconSelectorModalProps {
  modalState: IconModalState
  onOpenChange: (open: boolean) => void
  setModalState: (setter: (prev: IconModalState) => IconModalState) => void
  onSelect: (iconName: string) => void
}

const IconSelectorModal = ({
  modalState,
  onOpenChange,
  setModalState,
  onSelect
}: IconSelectorModalProps) => {
  const filteredIcons = useMemo(() => {
    const search = modalState.searchInput.toLowerCase().trim()
    if (!search) {
      return COMMON_MENU_ICONS
    }
    return COMMON_MENU_ICONS.filter(icon =>
      icon.toLowerCase().includes(search)
    )
  }, [modalState.searchInput])

  return (
    <FocusModal open={modalState.open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="max-w-3xl">
        <FocusModal.Header className="gap-1">
          <Heading level="h2" className="text-xl">
            Select an Icon
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Choose from {COMMON_MENU_ICONS.length} commonly used icons
          </Text>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4">
          <Input
            placeholder="Search icons by name..."
            value={modalState.searchInput}
            onChange={(e) =>
              setModalState(prev => ({
                ...prev,
                searchInput: e.target.value
              }))
            }
            autoFocus
          />

          <div className="h-96 overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
            {filteredIcons.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <Text size="small" className="text-ui-fg-muted">
                  No icons match your search.
                </Text>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredIcons.map(iconName => {
                  const isSelected = iconName === modalState.selectedIcon
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        setModalState(prev => ({ ...prev, selectedIcon: iconName }))
                        onSelect(iconName)
                        onOpenChange(false)
                      }}
                      className={`flex flex-col items-center gap-2 rounded-md border p-3 transition ${
                        isSelected
                          ? "border-ui-border-strong bg-ui-bg-base"
                          : "border-transparent hover:border-ui-border-base hover:bg-ui-bg-component"
                      }`}
                    >
                      <DynamicIcon name={iconName} size={24} />
                      <Text size="small" className="text-center break-words text-xs">
                        {iconName}
                      </Text>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

// Product Image Modal Component
interface ProductImageModalProps {
  modalState: ThumbnailModalState
  onOpenChange: (open: boolean) => void
  setModalState: (setter: (prev: ThumbnailModalState) => ThumbnailModalState) => void
  onSearch: (e: FormEvent<HTMLFormElement>) => void
  onSave: () => void
}

const ProductImageModal = ({
  modalState,
  onOpenChange,
  setModalState,
  onSearch,
  onSave
}: ProductImageModalProps) => {
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
            Pick a product from this category, then select one of its images to use as the thumbnail.
          </Text>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4">
          {modalState.categoryName ? (
            <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
              <Text size="small" className="font-medium">
                {modalState.categoryName}
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
                      Loading products...
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
                                alt={image.alt_text || "Product image"}
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
                          {image.alt_text && (
                            <Text size="small" className="text-ui-fg-muted truncate">
                              {image.alt_text}
                            </Text>
                          )}
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
              disabled={modalState.saving || !modalState.selectedProductId || !modalState.selectedImageId}
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

const MegaMenuPage = () => {
  // Global state
  const [globalState, setGlobalState] = useState<GlobalState>({
    loading: true,
    saving: false,
    config: null,
    defaults: {
      defaultMenuLayout: "simple-dropdown",
      baseHref: "/store?category="
    },
    defaultMenuLayout: "simple-dropdown"
  })

  // Category state
  const [categoryState, setCategoryState] = useState<CategoryState>({
    loading: false,
    loadingCategories: true,
    saving: false,
    categories: [],
    selectedCategoryId: null,
    selectedCategory: null,
    config: null,
    inherited: null,
    defaults: {
      defaultMenuLayout: "simple-dropdown",
      baseHref: "/store?category="
    },
    menuLayout: null,
    displayAsColumn: false,
    columnTitle: "",
    columnDescription: "",
    columnImageUrl: "",
    columnBadge: "",
    icon: "",
    thumbnailUrl: "",
    title: "",
    subtitle: "",
    excludedFromMenu: false,
    tagline: "",
    columnsText: "",
    featuredText: "",
    selectedThumbnailProductId: null,
    selectedThumbnailImageId: null,
    resolvedThumbnail: null,
    resolvedThumbnailProduct: null
  })

  // Thumbnail modal state
  const [thumbnailModalState, setThumbnailModalState] = useState<ThumbnailModalState>({
    open: false,
    categoryId: null,
    categoryName: null,
    searchInput: "",
    products: [],
    selectedProductId: null,
    selectedImageId: null,
    loading: false,
    saving: false,
    error: null
  })

  // Icon modal state
  const [iconModalState, setIconModalState] = useState<IconModalState>({
    open: false,
    searchInput: "",
    selectedIcon: null
  })

  // Load global config
  useEffect(() => {
    loadGlobalConfig()
  }, [])

  // Load categories
  useEffect(() => {
    loadCategories()
  }, [])

  // Load category config when selected
  useEffect(() => {
    if (categoryState.selectedCategoryId) {
      loadCategoryConfig(categoryState.selectedCategoryId)
    }
  }, [categoryState.selectedCategoryId])

  const loadGlobalConfig = async () => {
    try {
      const response = await fetch("/admin/mega-menu/global", {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error("Failed to load global configuration")
      }

      const data: GlobalResponse = await response.json()

      setGlobalState({
        loading: false,
        saving: false,
        config: data.config,
        defaults: data.defaults,
        defaultMenuLayout: data.config?.defaultMenuLayout || data.defaults.defaultMenuLayout
      })
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to load global configuration"
      })
      setGlobalState(prev => ({ ...prev, loading: false }))
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch("/admin/product-categories?fields=id,name,handle,description,parent_category_id,rank&limit=1000", {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error("Failed to load categories")
      }

      const data = await response.json()
      const categories: Category[] = data.product_categories || []

      // Load all mega-menu configs
      const configsResponse = await fetch("/admin/mega-menu/categories", {
        credentials: "include"
      })

      const configsData = configsResponse.ok ? await configsResponse.json() : { categories: [] }
      const configsByCategory = new Map<string, MegaMenuConfigDTO>()
      configsData.categories?.forEach((cat: any) => {
        if (cat.config) {
          configsByCategory.set(cat.id, cat.config)
        }
      })

      // Build hierarchy
      const categoryMap = new Map<string, CategoryWithConfig>()
      const rootCategories: CategoryWithConfig[] = []

      // First pass: create all categories with their configs
      categories.forEach(cat => {
        categoryMap.set(cat.id, {
          ...cat,
          config: configsByCategory.get(cat.id) || null,
          children: [],
          level: 0
        })
      })

      // Second pass: build hierarchy
      categories.forEach(cat => {
        const category = categoryMap.get(cat.id)!
        if (cat.parent_category_id) {
          const parent = categoryMap.get(cat.parent_category_id)
          if (parent) {
            parent.children = parent.children || []
            parent.children.push(category)
            category.level = (parent.level || 0) + 1
          }
        } else {
          rootCategories.push(category)
        }
      })

      // Sort by rank
      const sortByRank = (cats: CategoryWithConfig[]) => {
        cats.sort((a, b) => (a.rank || 0) - (b.rank || 0))
        cats.forEach(cat => {
          if (cat.children && cat.children.length > 0) {
            sortByRank(cat.children)
          }
        })
      }
      sortByRank(rootCategories)

      setCategoryState(prev => ({
        ...prev,
        loadingCategories: false,
        categories: rootCategories
      }))
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to load categories"
      })
      setCategoryState(prev => ({ ...prev, loadingCategories: false }))
    }
  }

  const loadCategoryConfig = async (categoryId: string) => {
    setCategoryState(prev => ({ ...prev, loading: true }))

    try {
      const response = await fetch(`/admin/mega-menu/${categoryId}`, {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error("Failed to load category configuration")
      }

      const data: CategoryConfigResponse = await response.json()

      // Find the selected category in the tree
      const findCategory = (cats: CategoryWithConfig[]): CategoryWithConfig | null => {
        for (const cat of cats) {
          if (cat.id === categoryId) return cat
          if (cat.children) {
            const found = findCategory(cat.children)
            if (found) return found
          }
        }
        return null
      }

      const selectedCategory = findCategory(categoryState.categories)

      setCategoryState(prev => ({
        ...prev,
        loading: false,
        selectedCategory,
        config: data.config,
        inherited: data.inherited,
        defaults: data.defaults,
        // Populate form fields
        menuLayout: data.config?.menuLayout || null,
        displayAsColumn: data.config?.displayAsColumn || false,
        columnTitle: data.config?.columnTitle || "",
        columnDescription: data.config?.columnDescription || "",
        columnImageUrl: data.config?.columnImageUrl || "",
        columnBadge: data.config?.columnBadge || "",
        icon: data.config?.icon || "",
        thumbnailUrl: data.config?.thumbnailUrl || "",
        title: data.config?.title || "",
        subtitle: data.config?.subtitle || "",
        excludedFromMenu: data.config?.excludedFromMenu || false,
        tagline: data.config?.tagline || "",
        columnsText: data.config?.columns ? JSON.stringify(data.config.columns, null, 2) : "",
        featuredText: data.config?.featured ? JSON.stringify(data.config.featured, null, 2) : "",
        // Populate thumbnail selection fields
        selectedThumbnailProductId: data.config?.selectedThumbnailProductId || null,
        selectedThumbnailImageId: data.config?.selectedThumbnailImageId || null,
        resolvedThumbnail: data.resolvedThumbnail || null,
        resolvedThumbnailProduct: data.resolvedThumbnailProduct || null
      }))
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to load category configuration"
      })
      setCategoryState(prev => ({ ...prev, loading: false }))
    }
  }

  const saveGlobalConfig = async () => {
    setGlobalState(prev => ({ ...prev, saving: true }))

    try {
      const response = await fetch("/admin/mega-menu/global", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          defaultMenuLayout: globalState.defaultMenuLayout
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save global configuration")
      }

      const data = await response.json()

      setGlobalState(prev => ({
        ...prev,
        saving: false,
        config: data.config
      }))

      toast.success("Success", {
        description: "Global configuration saved successfully"
      })
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save global configuration"
      })
      setGlobalState(prev => ({ ...prev, saving: false }))
    }
  }

  const saveCategoryConfig = async () => {
    if (!categoryState.selectedCategoryId) return

    setCategoryState(prev => ({ ...prev, saving: true }))

    try {
      const payload: any = {
        menuLayout: categoryState.menuLayout,
        excludedFromMenu: categoryState.excludedFromMenu
      }

      // Add level-specific fields
      if (categoryState.selectedCategory) {
        const level = categoryState.selectedCategory.level || 0

        // Second-level fields
        if (level === 1) {
          payload.displayAsColumn = categoryState.displayAsColumn
          payload.columnTitle = categoryState.columnTitle
          payload.columnDescription = categoryState.columnDescription
          payload.columnImageUrl = categoryState.columnImageUrl
          payload.columnBadge = categoryState.columnBadge
          // Also include item display fields for second-level
          payload.icon = categoryState.icon
          payload.thumbnailUrl = categoryState.thumbnailUrl
          payload.title = categoryState.title
          payload.subtitle = categoryState.subtitle
          // Include thumbnail selection
          payload.selectedThumbnailProductId = categoryState.selectedThumbnailProductId
          payload.selectedThumbnailImageId = categoryState.selectedThumbnailImageId
        }

        // Third-level fields
        if (level === 2) {
          payload.icon = categoryState.icon
          payload.thumbnailUrl = categoryState.thumbnailUrl
          payload.title = categoryState.title
          payload.subtitle = categoryState.subtitle
          // Include thumbnail selection
          payload.selectedThumbnailProductId = categoryState.selectedThumbnailProductId
          payload.selectedThumbnailImageId = categoryState.selectedThumbnailImageId
        }

        // Top-level can have tagline, columns, featured
        if (level === 0 && categoryState.menuLayout === "rich-columns") {
          payload.tagline = categoryState.tagline

          if (categoryState.columnsText) {
            try {
              payload.columns = JSON.parse(categoryState.columnsText)
            } catch {
              // Ignore parse errors
            }
          }

          if (categoryState.featuredText) {
            try {
              payload.featured = JSON.parse(categoryState.featuredText)
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      const response = await fetch(`/admin/mega-menu/${categoryState.selectedCategoryId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error("Failed to save category configuration")
      }

      const data = await response.json()

      setCategoryState(prev => ({
        ...prev,
        saving: false,
        config: data.config,
        resolvedThumbnail: data.resolvedThumbnail || null,
        resolvedThumbnailProduct: data.resolvedThumbnailProduct || null
      }))

      toast.success("Success", {
        description: "Category configuration saved successfully"
      })
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save category configuration"
      })
      setCategoryState(prev => ({ ...prev, saving: false }))
    }
  }

  // Thumbnail modal handlers
  const openThumbnailModal = useCallback((category: CategoryWithConfig | null) => {
    if (!category) return

    setThumbnailModalState({
      open: true,
      categoryId: category.id,
      categoryName: category.name,
      searchInput: "",
      products: [],
      selectedProductId: categoryState.selectedThumbnailProductId,
      selectedImageId: categoryState.selectedThumbnailImageId,
      loading: false,
      saving: false,
      error: null
    })

    // Load initial products
    loadThumbnailProducts(category.id, "")
  }, [categoryState.selectedThumbnailProductId, categoryState.selectedThumbnailImageId])

  const closeThumbnailModal = useCallback(() => {
    setThumbnailModalState(prev => ({ ...prev, open: false }))
  }, [])

  const loadThumbnailProducts = async (categoryId: string, search: string) => {
    setThumbnailModalState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        limit: "100"
      })
      if (search) {
        params.set("q", search)
      }

      const response = await fetch(`/admin/mega-menu/${categoryId}/products?${params}`, {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error("Failed to load products")
      }

      const data = await response.json()

      setThumbnailModalState(prev => ({
        ...prev,
        loading: false,
        products: data.products || []
      }))
    } catch (error) {
      setThumbnailModalState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load products"
      }))
    }
  }

  const handleThumbnailSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (thumbnailModalState.categoryId) {
      loadThumbnailProducts(thumbnailModalState.categoryId, thumbnailModalState.searchInput)
    }
  }

  const saveThumbnailSelection = async () => {
    if (!categoryState.selectedCategoryId || !thumbnailModalState.selectedProductId || !thumbnailModalState.selectedImageId) {
      toast.error("Error", {
        description: "Please select both a product and an image"
      })
      return
    }

    setThumbnailModalState(prev => ({ ...prev, saving: true, error: null }))

    try {
      const response = await fetch(`/admin/mega-menu/${categoryState.selectedCategoryId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          selectedThumbnailProductId: thumbnailModalState.selectedProductId,
          selectedThumbnailImageId: thumbnailModalState.selectedImageId
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save thumbnail selection")
      }

      const data = await response.json()

      // Update category state with the saved data
      setCategoryState(prev => ({
        ...prev,
        selectedThumbnailProductId: data.config?.selectedThumbnailProductId || null,
        selectedThumbnailImageId: data.config?.selectedThumbnailImageId || null,
        resolvedThumbnail: data.resolvedThumbnail || null,
        resolvedThumbnailProduct: data.resolvedThumbnailProduct || null,
        config: data.config
      }))

      toast.success("Success", {
        description: "Thumbnail selection saved successfully"
      })

      closeThumbnailModal()
    } catch (error) {
      setThumbnailModalState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : "Failed to save thumbnail selection"
      }))
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save thumbnail selection"
      })
    }
  }

  // Icon modal handlers
  const openIconModal = useCallback(() => {
    setIconModalState({
      open: true,
      searchInput: "",
      selectedIcon: categoryState.icon || null
    })
  }, [categoryState.icon])

  const closeIconModal = useCallback(() => {
    setIconModalState(prev => ({ ...prev, open: false }))
  }, [])

  const selectIcon = useCallback((iconName: string) => {
    setCategoryState(prev => ({ ...prev, icon: iconName }))
  }, [])

  // Get parent and grandparent for conditional rendering
  const getParent = (categoryId: string): CategoryWithConfig | null => {
    const findParent = (cats: CategoryWithConfig[]): CategoryWithConfig | null => {
      for (const cat of cats) {
        if (cat.children?.some(c => c.id === categoryId)) {
          return cat
        }
        if (cat.children) {
          const found = findParent(cat.children)
          if (found) return found
        }
      }
      return null
    }
    return findParent(categoryState.categories)
  }

  const parent = categoryState.selectedCategoryId ? getParent(categoryState.selectedCategoryId) : null
  const grandparent = parent ? getParent(parent.id) : null
  const parentMenuLayout = parent?.config?.menuLayout || globalState.defaultMenuLayout

  const hasChildren = categoryState.selectedCategory?.children && categoryState.selectedCategory.children.length > 0
  const level = categoryState.selectedCategory?.level || 0

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <Heading level="h1">Mega Menu Configuration</Heading>
      </div>

      {/* Global Config Section */}
      <Container>
        <div className="flex flex-col gap-y-4">
          <div>
            <Heading level="h2">Global Configuration</Heading>
            <Text className="text-ui-fg-muted text-sm mt-1">
              Default menu layout for all top-level categories. Override per-category below.
            </Text>
          </div>

          <div className="flex items-end gap-x-4">
            <div className="flex-1 flex flex-col gap-y-2">
              <Label>Default Menu Layout</Label>
              <Select
                value={globalState.defaultMenuLayout}
                onValueChange={(value) =>
                  setGlobalState(prev => ({ ...prev, defaultMenuLayout: value as MegaMenuLayout }))
                }
                disabled={globalState.loading || globalState.saving}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {MENU_LAYOUTS.map((layout) => (
                    <Select.Item key={layout.value} value={layout.value}>
                      <div className="flex flex-col">
                        <span>{layout.label}</span>
                        <span className="text-ui-fg-muted text-xs">{layout.description}</span>
                      </div>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Button
              onClick={saveGlobalConfig}
              disabled={globalState.loading || globalState.saving}
              isLoading={globalState.saving}
            >
              Save Global Config
            </Button>
          </div>
        </div>
      </Container>

      {/* Categories Section */}
      <Container>
        <div className="flex flex-col gap-y-4">
          <div>
            <Heading level="h2">Category Configuration</Heading>
            <Text className="text-ui-fg-subtle mt-1">
              Configure menu layout and options for individual categories
            </Text>
          </div>

              <div className="flex gap-x-4">
            {/* Left: Category Tree */}
            <div className="flex-1 border rounded-lg p-4 bg-ui-bg-base max-h-[600px] overflow-y-auto">
              {categoryState.loadingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <Text className="text-ui-fg-muted">Loading categories...</Text>
                </div>
              ) : categoryState.categories.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Text className="text-ui-fg-muted">No categories found</Text>
                </div>
              ) : (
                <CategoryTree
                  categories={categoryState.categories}
                  selectedId={categoryState.selectedCategoryId}
                  onSelect={(id) => setCategoryState(prev => ({ ...prev, selectedCategoryId: id }))}
                />
              )}
            </div>

            {/* Right: Configuration Panel */}
            {categoryState.selectedCategoryId && (
              <div className="flex-1 border rounded-lg p-4 bg-ui-bg-base max-h-[600px] overflow-y-auto">
                <div className="flex flex-col gap-y-4 border-t pt-4">
                  {/* Category Info */}
                  <div className="flex items-center gap-x-2">
                    <Badge size="small" color={level === 0 ? "blue" : level === 1 ? "green" : "orange"}>
                      {level === 0 ? "Top-level" : level === 1 ? "Second-level" : "Third-level"}
                    </Badge>
                    {parent && (
                      <Text className="text-ui-fg-muted text-sm">
                        Parent: {parent.name}
                      </Text>
                    )}
                  </div>

                  {/* Exclude from menu */}
                  <div className="flex items-center gap-x-2">
                    <Checkbox
                      id="excluded"
                      checked={categoryState.excludedFromMenu}
                      onCheckedChange={(checked) =>
                        setCategoryState(prev => ({ ...prev, excludedFromMenu: !!checked }))
                      }
                    />
                    <Label htmlFor="excluded">
                      Exclude from menu (retains config but hides category)
                    </Label>
                  </div>

                  {/* Top-level category options */}
                  {level === 0 && (
                    <>
                      {!hasChildren && (
                        <div className="bg-ui-bg-subtle p-4 rounded-md">
                          <Text className="text-ui-fg-muted">
                            This category has no sub-categories. Add sub-categories in the Products → Categories section to enable menu options.
                          </Text>
                        </div>
                      )}

                      {hasChildren && (
                        <>
                          <div className="flex flex-col gap-y-2">
                            <Label>Menu Layout</Label>
                            <Select
                              value={categoryState.menuLayout || "_default"}
                              onValueChange={(value) =>
                                setCategoryState(prev => ({
                                  ...prev,
                                  menuLayout: value === "_default" ? null : value as MegaMenuLayout
                                }))
                              }
                            >
                              <Select.Trigger>
                                <Select.Value />
                              </Select.Trigger>
                              <Select.Content>
                                <Select.Item value="_default">Use default ({globalState.defaultMenuLayout})</Select.Item>
                                {MENU_LAYOUTS.map((layout) => (
                                  <Select.Item key={layout.value} value={layout.value}>
                                    <div className="flex flex-col">
                                      <span>{layout.label}</span>
                                      <span className="text-ui-fg-muted text-xs">{layout.description}</span>
                                    </div>
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select>
                          </div>
                        </>
                      )}

                      {hasChildren && categoryState.menuLayout === "rich-columns" && (
                        <>
                          <div className="flex flex-col gap-y-2">
                            <Label>Tagline</Label>
                            <Input
                              value={categoryState.tagline}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, tagline: e.target.value }))
                              }
                              placeholder="Optional tagline text"
                            />
                          </div>

                          <div className="flex flex-col gap-y-2">
                            <Label>Columns (JSON)</Label>
                            <textarea
                              className="txt-compact-small bg-ui-bg-field border border-ui-border-base rounded-md p-2 font-mono"
                              rows={6}
                              value={categoryState.columnsText}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, columnsText: e.target.value }))
                              }
                              placeholder='[{"heading": "...", "items": [...]}]'
                            />
                          </div>

                          <div className="flex flex-col gap-y-2">
                            <Label>Featured Cards (JSON)</Label>
                            <textarea
                              className="txt-compact-small bg-ui-bg-field border border-ui-border-base rounded-md p-2 font-mono"
                              rows={6}
                              value={categoryState.featuredText}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, featuredText: e.target.value }))
                              }
                              placeholder='[{"label": "...", "href": "..."}]'
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Second-level category options */}
                  {level === 1 && (
                    <>
                      {parentMenuLayout !== "rich-columns" && (
                        <div className="bg-ui-bg-subtle p-4 rounded-md">
                          <Text className="text-ui-fg-muted">
                            Parent category must use "Rich Columns" layout to enable advanced column configuration.
                            Current parent layout: {parentMenuLayout}
                          </Text>
                        </div>
                      )}

                      {parentMenuLayout === "rich-columns" && (
                        <>
                          <div className="flex items-center gap-x-2">
                            <Checkbox
                              id="displayAsColumn"
                              checked={categoryState.displayAsColumn}
                              onCheckedChange={(checked) =>
                                setCategoryState(prev => ({ ...prev, displayAsColumn: !!checked }))
                              }
                            />
                            <Label htmlFor="displayAsColumn">
                              Display as title/image/description column
                            </Label>
                          </div>

                          {categoryState.displayAsColumn && (
                            <>
                              <div className="flex flex-col gap-y-2">
                                <Label>Column Title</Label>
                                <Input
                                  value={categoryState.columnTitle}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, columnTitle: e.target.value }))
                                  }
                                  placeholder="Leave empty to use category name"
                                />
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Column Description</Label>
                                <Input
                                  value={categoryState.columnDescription}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, columnDescription: e.target.value }))
                                  }
                                  placeholder="Leave empty to use category description"
                                />
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Column Image URL</Label>
                                <Input
                                  value={categoryState.columnImageUrl}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, columnImageUrl: e.target.value }))
                                  }
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Badge</Label>
                                <Select
                                  value={categoryState.columnBadge || "_none"}
                                  onValueChange={(value) =>
                                    setCategoryState(prev => ({ ...prev, columnBadge: value === "_none" ? "" : value }))
                                  }
                                >
                                  <Select.Trigger>
                                    <Select.Value />
                                  </Select.Trigger>
                                  <Select.Content>
                                    <Select.Item value="_none">No badge</Select.Item>
                                    <Select.Item value="new">New</Select.Item>
                                    <Select.Item value="offers">Offers</Select.Item>
                                    <Select.Item value="free-shipping">Free Shipping</Select.Item>
                                    <Select.Item value="featured">Featured</Select.Item>
                                  </Select.Content>
                                </Select>
                              </div>
                            </>
                          )}

                          {!categoryState.displayAsColumn && (
                            <>
                              <div className="bg-ui-bg-subtle p-4 rounded-md">
                                <Text className="text-ui-fg-muted">
                                  {hasChildren
                                    ? "This category will show its third-level sub-categories as a list. Configure third-level categories individually to set their icons, titles, and subtitles."
                                    : "No third-level categories available. Add sub-categories or enable 'Display as column' option."}
                                </Text>
                              </div>

                              {/* Third-level item display configuration when not displaying as column */}
                              <div className="flex flex-col gap-y-2">
                                <Label>Icon</Label>
                                {categoryState.icon ? (
                                  <div className="flex items-center gap-2 p-2 border rounded-md border-ui-border-base bg-ui-bg-subtle">
                                    <DynamicIcon name={categoryState.icon} size={20} />
                                    <Text size="small" className="flex-1">{categoryState.icon}</Text>
                                  </div>
                                ) : (
                                  <Text size="small" className="text-ui-fg-muted p-2">
                                    No icon selected
                                  </Text>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="small"
                                    onClick={openIconModal}
                                  >
                                    {categoryState.icon ? "Change Icon" : "Select Icon"}
                                  </Button>
                                  {categoryState.icon && (
                                    <Button
                                      variant="secondary"
                                      size="small"
                                      onClick={() => setCategoryState(prev => ({ ...prev, icon: "" }))}
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Thumbnail</Label>
                                {categoryState.resolvedThumbnail?.url ? (
                                  <div className="space-y-2">
                                    <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-2">
                                      <img
                                        src={categoryState.resolvedThumbnail.url}
                                        alt={categoryState.resolvedThumbnail.alt_text || "Thumbnail"}
                                        className="h-32 w-full object-cover rounded"
                                      />
                                    </div>
                                    <Text size="small" className="text-ui-fg-muted">
                                      {categoryState.resolvedThumbnailProduct?.title}
                                    </Text>
                                  </div>
                                ) : categoryState.thumbnailUrl ? (
                                  <div className="space-y-2">
                                    <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-2">
                                      <img
                                        src={categoryState.thumbnailUrl}
                                        alt="Thumbnail"
                                        className="h-32 w-full object-cover rounded"
                                      />
                                    </div>
                                    <Text size="small" className="text-ui-fg-muted">
                                      Custom URL: {categoryState.thumbnailUrl}
                                    </Text>
                                  </div>
                                ) : (
                                  <Text size="small" className="text-ui-fg-muted">
                                    No thumbnail selected
                                  </Text>
                                )}
                                <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={() => openThumbnailModal(categoryState.selectedCategory)}
                                >
                                  {categoryState.resolvedThumbnail ? "Change Image" : "Select Product Image"}
                                </Button>
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Title Override</Label>
                                <Input
                                  value={categoryState.title}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, title: e.target.value }))
                                  }
                                  placeholder="Leave empty to use category name"
                                />
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Subtitle</Label>
                                <Input
                                  value={categoryState.subtitle}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, subtitle: e.target.value }))
                                  }
                                  placeholder="Leave empty to use category description (clamped)"
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Third-level category options */}
                  {level === 2 && (
                    <>
                      {(!grandparent || grandparent.config?.menuLayout !== "rich-columns" || parent?.config?.displayAsColumn) && (
                        <div className="bg-ui-bg-subtle p-4 rounded-md">
                          <Text className="text-ui-fg-muted">
                            Third-level configuration is only available when the grandparent uses "Rich Columns" layout
                            and the parent shows third-level categories (not set to "Display as column").
                          </Text>
                        </div>
                      )}

                      {grandparent?.config?.menuLayout === "rich-columns" && !parent?.config?.displayAsColumn && (
                        <>
                          <div className="flex flex-col gap-y-2">
                            <Label>Icon</Label>
                            {categoryState.icon ? (
                              <div className="flex items-center gap-2 p-2 border rounded-md border-ui-border-base bg-ui-bg-subtle">
                                <DynamicIcon name={categoryState.icon} size={20} />
                                <Text size="small" className="flex-1">{categoryState.icon}</Text>
                              </div>
                            ) : (
                              <Text size="small" className="text-ui-fg-muted p-2">
                                No icon selected
                              </Text>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={openIconModal}
                              >
                                {categoryState.icon ? "Change Icon" : "Select Icon"}
                              </Button>
                              {categoryState.icon && (
                                <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={() => setCategoryState(prev => ({ ...prev, icon: "" }))}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-y-2">
                            <Label>Thumbnail</Label>
                            {categoryState.resolvedThumbnail?.url ? (
                              <div className="space-y-2">
                                <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-2">
                                  <img
                                    src={categoryState.resolvedThumbnail.url}
                                    alt={categoryState.resolvedThumbnail.alt_text || "Thumbnail"}
                                    className="h-32 w-full object-cover rounded"
                                  />
                                </div>
                                <Text size="small" className="text-ui-fg-muted">
                                  {categoryState.resolvedThumbnailProduct?.title}
                                </Text>
                              </div>
                            ) : categoryState.thumbnailUrl ? (
                              <div className="space-y-2">
                                <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-2">
                                  <img
                                    src={categoryState.thumbnailUrl}
                                    alt="Thumbnail"
                                    className="h-32 w-full object-cover rounded"
                                  />
                                </div>
                                <Text size="small" className="text-ui-fg-muted">
                                  Custom URL: {categoryState.thumbnailUrl}
                                </Text>
                              </div>
                            ) : (
                              <Text size="small" className="text-ui-fg-muted">
                                No thumbnail selected
                              </Text>
                            )}
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => openThumbnailModal(categoryState.selectedCategory)}
                            >
                              {categoryState.resolvedThumbnail ? "Change Image" : "Select Product Image"}
                            </Button>
                          </div>

                          <div className="flex flex-col gap-y-2">
                            <Label>Title</Label>
                            <Input
                              value={categoryState.title}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, title: e.target.value }))
                              }
                              placeholder="Leave empty to use category name"
                            />
                          </div>

                          <div className="flex flex-col gap-y-2">
                            <Label>Subtitle</Label>
                            <Input
                              value={categoryState.subtitle}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, subtitle: e.target.value }))
                              }
                              placeholder="Leave empty to use category description (clamped)"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="flex justify-end gap-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => setCategoryState(prev => ({ ...prev, selectedCategoryId: null }))}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveCategoryConfig}
                      disabled={categoryState.loading || categoryState.saving}
                      isLoading={categoryState.saving}
                    >
                      Save Category Configuration
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* Product Image Modal */}
      <ProductImageModal
        modalState={thumbnailModalState}
        onOpenChange={closeThumbnailModal}
        setModalState={setThumbnailModalState}
        onSearch={handleThumbnailSearch}
        onSave={saveThumbnailSelection}
      />

      {/* Icon Selector Modal */}
      <IconSelectorModal
        modalState={iconModalState}
        onOpenChange={closeIconModal}
        setModalState={setIconModalState}
        onSelect={selectIcon}
      />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Mega Menu",
  icon: GridList
})

export default MegaMenuPage
