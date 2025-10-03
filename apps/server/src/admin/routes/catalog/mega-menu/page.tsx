import { defineRouteConfig } from "@medusajs/admin-sdk"
import { GridList } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  toast
} from "@medusajs/ui"
import {
  useCallback,
  useEffect,
  useState
} from "react"
import type {
  MegaMenuConfigDTO,
  MegaMenuLayout
} from "../../../../modules/mega-menu"

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
    featuredText: ""
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
        featuredText: data.config?.featured ? JSON.stringify(data.config.featured, null, 2) : ""
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
        }

        // Third-level fields
        if (level === 2) {
          payload.icon = categoryState.icon
          payload.thumbnailUrl = categoryState.thumbnailUrl
          payload.title = categoryState.title
          payload.subtitle = categoryState.subtitle
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
        config: data.config
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
                                <Input
                                  value={categoryState.icon}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, icon: e.target.value }))
                                  }
                                  placeholder="Icon name or identifier for this item"
                                />
                              </div>

                              <div className="flex flex-col gap-y-2">
                                <Label>Thumbnail URL</Label>
                                <Input
                                  value={categoryState.thumbnailUrl}
                                  onChange={(e) =>
                                    setCategoryState(prev => ({ ...prev, thumbnailUrl: e.target.value }))
                                  }
                                  placeholder="https://..."
                                />
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
                            <Input
                              value={categoryState.icon}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, icon: e.target.value }))
                              }
                              placeholder="Icon name or identifier"
                            />
                          </div>

                          <div className="flex flex-col gap-y-2">
                            <Label>Thumbnail URL</Label>
                            <Input
                              value={categoryState.thumbnailUrl}
                              onChange={(e) =>
                                setCategoryState(prev => ({ ...prev, thumbnailUrl: e.target.value }))
                              }
                              placeholder="https://..."
                            />
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
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Mega Menu",
  icon: GridList
})

export default MegaMenuPage
