import MegaMenuService from "../../service"
import { ProductCategoryDTO } from "@medusajs/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  MegaMenuConfigInput,
  MegaMenuColumnConfig,
  MegaMenuLinkConfig,
  MegaMenuFeaturedCardConfig,
  MEGA_MENU_GLOBAL_ID
} from "../../types"
import type { DynamicCategoryMenuItem } from "../../../dynamic-category-menu"

const buildCategory = (
  overrides: Partial<ProductCategoryDTO>
): ProductCategoryDTO => {
  const now = new Date()

  return {
    id: "pcat_test",
    name: "Category",
    description: "Category description",
    handle: "category",
    is_active: true,
    is_internal: false,
    rank: 0,
    metadata: undefined,
    parent_category: null,
    parent_category_id: null,
    category_children: [],
    products: [],
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
    ...overrides,
  } as ProductCategoryDTO
}

const buildService = (options = {}) => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  const service = new MegaMenuService({ logger: logger as any }, options)

  // Mock the MedusaService methods
  service.listMegaMenuConfigs = jest.fn()
  service.createMegaMenuConfigs = jest.fn()
  service.updateMegaMenuConfigs = jest.fn()
  service.deleteMegaMenuConfigs = jest.fn()

  return {
    service,
    logger,
    mocks: {
      listMegaMenuConfigs: service.listMegaMenuConfigs as jest.Mock,
      createMegaMenuConfigs: service.createMegaMenuConfigs as jest.Mock,
      updateMegaMenuConfigs: service.updateMegaMenuConfigs as jest.Mock,
      deleteMegaMenuConfigs: service.deleteMegaMenuConfigs as jest.Mock,
    }
  }
}

describe("MegaMenuService", () => {
  describe("Configuration Management", () => {
    describe("upsertCategoryConfig", () => {
      it("should create new config when it doesn't exist", async () => {
        const { service, mocks } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: "cat_123",
          menuLayout: "rich-columns",
          tagline: "Test tagline"
        }

        const mockCreated = {
          id: "config_123",
          category_id: "cat_123",
          menu_layout: "rich-columns",
          tagline: "Test tagline",
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          default_menu_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([])
        mocks.createMegaMenuConfigs.mockResolvedValue(mockCreated)

        const result = await service.upsertCategoryConfig(input)

        expect(mocks.listMegaMenuConfigs).toHaveBeenCalledWith(
          { category_id: "cat_123" },
          { take: 1 }
        )
        expect(mocks.createMegaMenuConfigs).toHaveBeenCalled()
        expect(result.categoryId).toBe("cat_123")
        expect(result.menuLayout).toBe("rich-columns")
      })

      it("should update existing config when it exists", async () => {
        const { service, mocks } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: "cat_123",
          menuLayout: "simple-dropdown",
          tagline: "Updated tagline"
        }

        const existing = {
          id: "config_123",
          category_id: "cat_123",
          menu_layout: "rich-columns",
          tagline: "Old tagline",
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          default_menu_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        const mockUpdated = {
          ...existing,
          menu_layout: "simple-dropdown",
          tagline: "Updated tagline"
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([existing])
        mocks.updateMegaMenuConfigs.mockResolvedValue(mockUpdated)

        const result = await service.upsertCategoryConfig(input)

        expect(mocks.updateMegaMenuConfigs).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "config_123",
            category_id: "cat_123",
            menu_layout: "simple-dropdown",
            tagline: "Updated tagline"
          })
        )
        expect(result.menuLayout).toBe("simple-dropdown")
      })

      it("should throw error when categoryId is empty", async () => {
        const { service } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: "",
          menuLayout: "rich-columns"
        }

        await expect(service.upsertCategoryConfig(input)).rejects.toThrow(MedusaError)
        await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
          "Category ID is required"
        )
      })

      it("should throw error when categoryId is null or whitespace", async () => {
        const { service } = buildService()

        const inputNull: MegaMenuConfigInput = {
          categoryId: null as any,
          menuLayout: "rich-columns"
        }

        const inputWhitespace: MegaMenuConfigInput = {
          categoryId: "   ",
          menuLayout: "rich-columns"
        }

        await expect(service.upsertCategoryConfig(inputNull)).rejects.toThrow(MedusaError)
        await expect(service.upsertCategoryConfig(inputWhitespace)).rejects.toThrow(MedusaError)
      })

      it("should normalize all string fields", async () => {
        const { service, mocks } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: "  cat_123  ",
          menuLayout: "rich-columns",
          tagline: "  Test tagline  ",
          columnTitle: "  Column Title  ",
          title: "  Title  "
        }

        const mockCreated = {
          id: "config_123",
          category_id: "cat_123",
          menu_layout: "rich-columns",
          tagline: "Test tagline",
          column_title: "Column Title",
          title: "Title",
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          default_menu_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([])
        mocks.createMegaMenuConfigs.mockResolvedValue(mockCreated)

        await service.upsertCategoryConfig(input)

        expect(mocks.createMegaMenuConfigs).toHaveBeenCalledWith(
          expect.objectContaining({
            category_id: "cat_123",
            tagline: "Test tagline",
            column_title: "Column Title",
            title: "Title"
          })
        )
      })
    })

    describe("upsertGlobalConfig", () => {
      it("should create global config with MEGA_MENU_GLOBAL_ID", async () => {
        const { service, mocks } = buildService()

        const input = {
          defaultMenuLayout: "rich-columns" as const
        }

        const mockCreated = {
          id: "config_global",
          category_id: MEGA_MENU_GLOBAL_ID,
          default_menu_layout: "rich-columns",
          menu_layout: null,
          tagline: null,
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([])
        mocks.createMegaMenuConfigs.mockResolvedValue(mockCreated)

        const result = await service.upsertGlobalConfig(input)

        expect(mocks.createMegaMenuConfigs).toHaveBeenCalledWith(
          expect.objectContaining({
            category_id: MEGA_MENU_GLOBAL_ID,
            default_menu_layout: "rich-columns"
          })
        )
        expect(result.categoryId).toBe(MEGA_MENU_GLOBAL_ID)
        expect(result.defaultMenuLayout).toBe("rich-columns")
      })

      it("should override categoryId if provided", async () => {
        const { service, mocks } = buildService()

        const input = {
          categoryId: "cat_123",
          defaultMenuLayout: "simple-dropdown" as const
        }

        const mockCreated = {
          id: "config_global",
          category_id: MEGA_MENU_GLOBAL_ID,
          default_menu_layout: "simple-dropdown",
          menu_layout: null,
          tagline: null,
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([])
        mocks.createMegaMenuConfigs.mockResolvedValue(mockCreated)

        await service.upsertGlobalConfig(input)

        expect(mocks.createMegaMenuConfigs).toHaveBeenCalledWith(
          expect.objectContaining({
            category_id: MEGA_MENU_GLOBAL_ID
          })
        )
      })
    })

    describe("deleteCategoryConfig", () => {
      it("should delete existing config", async () => {
        const { service, mocks } = buildService()

        const existing = {
          id: "config_123",
          category_id: "cat_123",
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([existing])

        await service.deleteCategoryConfig("cat_123")

        expect(mocks.listMegaMenuConfigs).toHaveBeenCalledWith(
          { category_id: "cat_123" },
          { take: 1 }
        )
        expect(mocks.deleteMegaMenuConfigs).toHaveBeenCalledWith("config_123")
      })

      it("should not throw error when config doesn't exist", async () => {
        const { service, mocks } = buildService()

        mocks.listMegaMenuConfigs.mockResolvedValue([])

        await expect(service.deleteCategoryConfig("cat_123")).resolves.not.toThrow()
        expect(mocks.deleteMegaMenuConfigs).not.toHaveBeenCalled()
      })

      it("should handle empty or null categoryId", async () => {
        const { service, mocks } = buildService()

        await service.deleteCategoryConfig("")
        await service.deleteCategoryConfig(null as any)
        await service.deleteCategoryConfig("   ")

        expect(mocks.listMegaMenuConfigs).not.toHaveBeenCalled()
        expect(mocks.deleteMegaMenuConfigs).not.toHaveBeenCalled()
      })
    })

    describe("getCategoryConfig", () => {
      it("should return config DTO when it exists", async () => {
        const { service, mocks } = buildService()

        const existing = {
          id: "config_123",
          category_id: "cat_123",
          menu_layout: "rich-columns",
          tagline: "Test",
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          default_menu_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([existing])

        const result = await service.getCategoryConfig("cat_123")

        expect(result).not.toBeNull()
        expect(result?.categoryId).toBe("cat_123")
        expect(result?.menuLayout).toBe("rich-columns")
      })

      it("should return null when config doesn't exist", async () => {
        const { service, mocks } = buildService()

        mocks.listMegaMenuConfigs.mockResolvedValue([])

        const result = await service.getCategoryConfig("cat_123")

        expect(result).toBeNull()
      })

      it("should return null for empty or null categoryId", async () => {
        const { service, mocks } = buildService()

        const result1 = await service.getCategoryConfig("")
        const result2 = await service.getCategoryConfig(null as any)
        const result3 = await service.getCategoryConfig("   ")

        expect(result1).toBeNull()
        expect(result2).toBeNull()
        expect(result3).toBeNull()
        expect(mocks.listMegaMenuConfigs).not.toHaveBeenCalled()
      })
    })

    describe("getGlobalConfig", () => {
      it("should return global config when it exists", async () => {
        const { service, mocks } = buildService()

        const existing = {
          id: "config_global",
          category_id: MEGA_MENU_GLOBAL_ID,
          default_menu_layout: "simple-dropdown",
          menu_layout: null,
          tagline: null,
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockResolvedValue([existing])

        const result = await service.getGlobalConfig()

        expect(result).not.toBeNull()
        expect(result?.categoryId).toBe(MEGA_MENU_GLOBAL_ID)
        expect(result?.defaultMenuLayout).toBe("simple-dropdown")
      })

      it("should return null when global config doesn't exist", async () => {
        const { service, mocks } = buildService()

        mocks.listMegaMenuConfigs.mockResolvedValue([])

        const result = await service.getGlobalConfig()

        expect(result).toBeNull()
      })
    })

    describe("getConfigMap", () => {
      it("should return map of category configs", async () => {
        const { service, mocks } = buildService()

        const configs = [
          {
            id: "config_1",
            category_id: "cat_1",
            menu_layout: "rich-columns",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "config_2",
            category_id: "cat_2",
            menu_layout: "simple-dropdown",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]

        mocks.listMegaMenuConfigs.mockResolvedValue(configs)

        const result = await service.getConfigMap(["cat_1", "cat_2"])

        expect(result.size).toBe(2)
        expect(result.get("cat_1")?.menuLayout).toBe("rich-columns")
        expect(result.get("cat_2")?.menuLayout).toBe("simple-dropdown")
      })

      it("should return empty map for empty array", async () => {
        const { service, mocks } = buildService()

        const result = await service.getConfigMap([])

        expect(result.size).toBe(0)
        expect(mocks.listMegaMenuConfigs).not.toHaveBeenCalled()
      })

      it("should deduplicate and filter empty category IDs", async () => {
        const { service, mocks } = buildService()

        const configs = [
          {
            id: "config_1",
            category_id: "cat_1",
            menu_layout: "rich-columns",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]

        mocks.listMegaMenuConfigs.mockResolvedValue(configs)

        const result = await service.getConfigMap(["cat_1", "cat_1", "", "   ", null as any])

        expect(mocks.listMegaMenuConfigs).toHaveBeenCalledWith({
          category_id: ["cat_1"]
        })
        expect(result.size).toBe(1)
      })
    })
  })

  describe("Navigation Building", () => {
    describe("buildNavigationWithMegaMenu", () => {
      it("should build navigation with no-menu layout", async () => {
        const { service, mocks } = buildService()

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Category 1",
            href: "/store?category=cat_1",
            subLabel: "Description",
            children: [
              {
                id: "cat_1_1",
                label: "Subcategory 1.1",
                href: "/store?category=cat_1_1",
                children: []
              }
            ]
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1", name: "Category 1" }),
          buildCategory({ id: "cat_1_1", name: "Subcategory 1.1", parent_category_id: "cat_1" })
        ]

        const configs = [
          {
            id: "config_1",
            category_id: "cat_1",
            menu_layout: "no-menu",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]

        mocks.listMegaMenuConfigs.mockImplementation((filter) => {
          if (filter.category_id === MEGA_MENU_GLOBAL_ID) {
            return Promise.resolve([])
          }
          return Promise.resolve(configs)
        })

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        expect(result).toHaveLength(1)
        expect(result[0].menuLayout).toBe("no-menu")
        expect(result[0].children).toHaveLength(0) // no children when menuLayout is no-menu
      })

      it("should exclude categories marked as excluded", async () => {
        const { service, mocks } = buildService()

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Category 1",
            href: "/store?category=cat_1",
            children: []
          },
          {
            id: "cat_2",
            label: "Category 2",
            href: "/store?category=cat_2",
            children: []
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1", name: "Category 1" }),
          buildCategory({ id: "cat_2", name: "Category 2" })
        ]

        const configs = [
          {
            id: "config_2",
            category_id: "cat_2",
            menu_layout: "simple-dropdown",
            excluded_from_menu: true,
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]

        mocks.listMegaMenuConfigs.mockImplementation((filter) => {
          if (filter.category_id === MEGA_MENU_GLOBAL_ID) {
            return Promise.resolve([])
          }
          return Promise.resolve(configs)
        })

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe("cat_1")
      })

      it("should limit depth to 3 levels", async () => {
        const { service, mocks } = buildService()

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Level 1",
            href: "/store?category=cat_1",
            children: [
              {
                id: "cat_2",
                label: "Level 2",
                href: "/store?category=cat_2",
                children: [
                  {
                    id: "cat_3",
                    label: "Level 3",
                    href: "/store?category=cat_3",
                    children: [
                      {
                        id: "cat_4",
                        label: "Level 4",
                        href: "/store?category=cat_4",
                        children: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1" }),
          buildCategory({ id: "cat_2" }),
          buildCategory({ id: "cat_3" }),
          buildCategory({ id: "cat_4" })
        ]

        mocks.listMegaMenuConfigs.mockResolvedValue([])

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        expect(result[0].children).toHaveLength(1)
        expect(result[0].children[0].children).toHaveLength(1)
        expect(result[0].children[0].children[0].children).toHaveLength(0) // 4th level excluded
      })

      it("should add column display fields for second-level categories when parent has rich-columns", async () => {
        const { service, mocks } = buildService()

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Parent",
            href: "/store?category=cat_1",
            children: [
              {
                id: "cat_2",
                label: "Second Level",
                href: "/store?category=cat_2",
                children: []
              }
            ]
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1" }),
          buildCategory({ id: "cat_2" })
        ]

        const configs = [
          {
            id: "config_1",
            category_id: "cat_1",
            menu_layout: "rich-columns",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "config_2",
            category_id: "cat_2",
            menu_layout: null,
            display_as_column: true,
            column_title: "Column Title",
            column_description: "Column Description",
            column_image_url: "https://example.com/image.jpg",
            column_badge: "new",
            icon: "ShoppingBag",
            thumbnail_url: "https://example.com/thumb.jpg",
            title: "Display Title",
            subtitle: "Display Subtitle",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            column_image_source: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]

        mocks.listMegaMenuConfigs.mockImplementation((filter) => {
          if (filter.category_id === MEGA_MENU_GLOBAL_ID) {
            return Promise.resolve([])
          }
          return Promise.resolve(configs)
        })

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        const secondLevel = result[0].children[0]
        expect(secondLevel.displayAsColumn).toBe(true)
        expect(secondLevel.columnTitle).toBe("Column Title")
        expect(secondLevel.columnDescription).toBe("Column Description")
        expect(secondLevel.columnImageUrl).toBe("https://example.com/image.jpg")
        expect(secondLevel.columnBadge).toBe("new")
        expect(secondLevel.icon).toBe("ShoppingBag")
        expect(secondLevel.thumbnailUrl).toBe("https://example.com/thumb.jpg")
        expect(secondLevel.title).toBe("Display Title")
        expect(secondLevel.subtitle).toBe("Display Subtitle")
      })

      it("should add icon/thumbnail fields for third-level categories when grandparent has rich-columns", async () => {
        const { service, mocks } = buildService()

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Grandparent",
            href: "/store?category=cat_1",
            children: [
              {
                id: "cat_2",
                label: "Parent",
                href: "/store?category=cat_2",
                children: [
                  {
                    id: "cat_3",
                    label: "Third Level",
                    href: "/store?category=cat_3",
                    children: []
                  }
                ]
              }
            ]
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1" }),
          buildCategory({ id: "cat_2" }),
          buildCategory({ id: "cat_3" })
        ]

        const configs = [
          {
            id: "config_1",
            category_id: "cat_1",
            menu_layout: "rich-columns",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            icon: null,
            thumbnail_url: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            title: null,
            subtitle: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "config_3",
            category_id: "cat_3",
            menu_layout: null,
            icon: "Heart",
            thumbnail_url: "https://example.com/thumb3.jpg",
            title: "Third Level Title",
            subtitle: "Third Level Subtitle",
            columns: [],
            featured: [],
            submenu_category_ids: [],
            metadata: null,
            display_as_column: null,
            column_title: null,
            column_description: null,
            column_image_url: null,
            column_image_source: null,
            column_badge: null,
            selected_thumbnail_product_id: null,
            selected_thumbnail_image_id: null,
            excluded_from_menu: false,
            layout: null,
            display_mode: null,
            column_layout: null,
            default_menu_layout: null,
            tagline: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        ]

        mocks.listMegaMenuConfigs.mockImplementation((filter) => {
          if (filter.category_id === MEGA_MENU_GLOBAL_ID) {
            return Promise.resolve([])
          }
          return Promise.resolve(configs)
        })

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        const thirdLevel = result[0].children[0].children[0]
        expect(thirdLevel.icon).toBe("Heart")
        expect(thirdLevel.thumbnailUrl).toBe("https://example.com/thumb3.jpg")
        expect(thirdLevel.title).toBe("Third Level Title")
        expect(thirdLevel.subtitle).toBe("Third Level Subtitle")
      })

      it("should use global defaultMenuLayout when no category config exists", async () => {
        const { service, mocks } = buildService()

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Category 1",
            href: "/store?category=cat_1",
            children: []
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1" })
        ]

        const globalConfig = {
          id: "config_global",
          category_id: MEGA_MENU_GLOBAL_ID,
          default_menu_layout: "rich-columns",
          menu_layout: null,
          columns: [],
          featured: [],
          submenu_category_ids: [],
          metadata: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          tagline: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        mocks.listMegaMenuConfigs.mockImplementation((filter) => {
          if (filter.category_id === MEGA_MENU_GLOBAL_ID) {
            return Promise.resolve([globalConfig])
          }
          return Promise.resolve([])
        })

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        expect(result[0].menuLayout).toBe("rich-columns")
      })

      it("should use service options default when no global config exists", async () => {
        const { service, mocks } = buildService({ defaultLayout: "no-menu" })

        const navigation: DynamicCategoryMenuItem[] = [
          {
            id: "cat_1",
            label: "Category 1",
            href: "/store?category=cat_1",
            children: []
          }
        ]

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1" })
        ]

        mocks.listMegaMenuConfigs.mockResolvedValue([])

        const result = await service.buildNavigationWithMegaMenu(navigation, categories)

        expect(result[0].menuLayout).toBe("no-menu")
      })
    })
  })

  describe("Content Building", () => {
    describe("buildManualColumns", () => {
      it("should build columns with links", () => {
        const { service } = buildService()

        const columns: MegaMenuColumnConfig[] = [
          {
            heading: "Column 1",
            description: "Description 1",
            items: [
              { label: "Link 1", href: "/link1" },
              { label: "Link 2", href: "/link2" }
            ]
          }
        ]

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = service["buildManualColumns"](columns, categoryMap)

        expect(result).toHaveLength(1)
        expect(result[0].heading).toBe("Column 1")
        expect(result[0].description).toBe("Description 1")
        expect(result[0].items).toHaveLength(2)
      })

      it("should filter out columns with no items and no image", () => {
        const { service } = buildService()

        const columns: MegaMenuColumnConfig[] = [
          {
            heading: "Empty Column",
            items: []
          },
          {
            heading: "Column with Image",
            imageUrl: "https://example.com/image.jpg",
            items: []
          }
        ]

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = service["buildManualColumns"](columns, categoryMap)

        expect(result).toHaveLength(1)
        expect(result[0].heading).toBe("Column with Image")
      })

      it("should handle undefined columns", () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = service["buildManualColumns"](undefined, categoryMap)

        expect(result).toHaveLength(0)
      })

      it("should normalize string fields", () => {
        const { service } = buildService()

        const columns: MegaMenuColumnConfig[] = [
          {
            heading: "  Column Heading  ",
            description: "  Description  ",
            items: [
              { label: "Link", href: "/link" }
            ]
          }
        ]

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = service["buildManualColumns"](columns, categoryMap)

        expect(result[0].heading).toBe("Column Heading")
        expect(result[0].description).toBe("Description")
      })
    })

    describe("buildFeatured", () => {
      it("should build featured cards", () => {
        const { service } = buildService()

        const featured: MegaMenuFeaturedCardConfig[] = [
          {
            eyebrow: "New",
            label: "Featured Item",
            href: "/featured",
            description: "Featured description",
            ctaLabel: "Shop Now",
            imageUrl: "https://example.com/featured.jpg"
          }
        ]

        const result = service["buildFeatured"](featured)

        expect(result).toHaveLength(1)
        expect(result[0].eyebrow).toBe("New")
        expect(result[0].label).toBe("Featured Item")
        expect(result[0].href).toBe("/featured")
        expect(result[0].description).toBe("Featured description")
        expect(result[0].ctaLabel).toBe("Shop Now")
        expect(result[0].imageUrl).toBe("https://example.com/featured.jpg")
      })

      it("should filter out cards without label or href", () => {
        const { service } = buildService()

        const featured: MegaMenuFeaturedCardConfig[] = [
          {
            label: "Valid Card",
            href: "/valid"
          },
          {
            label: "Missing Href",
            href: null
          },
          {
            label: null,
            href: "/missing-label"
          },
          {
            label: "  ",
            href: "/whitespace-label"
          }
        ]

        const result = service["buildFeatured"](featured)

        expect(result).toHaveLength(1)
        expect(result[0].label).toBe("Valid Card")
      })

      it("should handle undefined featured", () => {
        const { service } = buildService()

        const result = service["buildFeatured"](undefined)

        expect(result).toHaveLength(0)
      })

      it("should normalize string fields", () => {
        const { service } = buildService()

        const featured: MegaMenuFeaturedCardConfig[] = [
          {
            eyebrow: "  Eyebrow  ",
            label: "  Label  ",
            href: "  /href  ",
            description: "  Description  ",
            ctaLabel: "  CTA  "
          }
        ]

        const result = service["buildFeatured"](featured)

        expect(result[0].eyebrow).toBe("Eyebrow")
        expect(result[0].label).toBe("Label")
        expect(result[0].href).toBe("/href")
        expect(result[0].description).toBe("Description")
        expect(result[0].ctaLabel).toBe("CTA")
      })
    })

    describe("buildAutomaticItems", () => {
      it("should build items from category IDs", async () => {
        const { service } = buildService()

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1", name: "Category 1", handle: "cat-1", description: "Description 1" }),
          buildCategory({ id: "cat_2", name: "Category 2", handle: "cat-2", description: "Description 2" })
        ]

        const categoryMap = new Map(categories.map(c => [c.id, c]))

        const result = await service["buildAutomaticItems"](
          ["cat_1", "cat_2"],
          categoryMap
        )

        expect(result).toHaveLength(2)
        expect(result[0].label).toBe("Category 1")
        expect(result[0].href).toBe("/store?category=cat-1")
        expect(result[0].description).toBe("Description 1")
      })

      it("should deduplicate category IDs", async () => {
        const { service } = buildService()

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1", name: "Category 1" })
        ]

        const categoryMap = new Map(categories.map(c => [c.id, c]))

        const result = await service["buildAutomaticItems"](
          ["cat_1", "cat_1", "cat_1"],
          categoryMap
        )

        expect(result).toHaveLength(1)
      })

      it("should skip categories not in categoryMap", async () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = await service["buildAutomaticItems"](
          ["cat_1", "cat_2"],
          categoryMap
        )

        expect(result).toHaveLength(0)
      })

      it("should include subcategory config fields when provided", async () => {
        const { service, mocks } = buildService()

        const categories: ProductCategoryDTO[] = [
          buildCategory({ id: "cat_1", name: "Category 1", handle: "cat-1" })
        ]

        const categoryMap = new Map(categories.map(c => [c.id, c]))

        const configMap = new Map([
          ["cat_1", {
            id: "config_1",
            categoryId: "cat_1",
            columnBadge: "new" as const,
            columnImageUrl: "https://example.com/image.jpg",
            defaultMenuLayout: null,
            menuLayout: null,
            tagline: null,
            columns: [],
            featured: [],
            submenuCategoryIds: [],
            metadata: null,
            displayAsColumn: null,
            columnTitle: null,
            columnDescription: null,
            columnImageSource: null,
            icon: null,
            thumbnailUrl: null,
            selectedThumbnailProductId: null,
            selectedThumbnailImageId: null,
            title: null,
            subtitle: null,
            excludedFromMenu: false,
            layout: null,
            displayMode: null,
            columnLayout: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]
        ])

        const result = await service["buildAutomaticItems"](
          ["cat_1"],
          categoryMap,
          configMap
        )

        expect(result[0].badge).toBe("new")
        expect(result[0].thumbnailUrl).toBe("https://example.com/image.jpg")
      })

      it("should handle undefined categoryIds", async () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = await service["buildAutomaticItems"](
          undefined,
          categoryMap
        )

        expect(result).toHaveLength(0)
      })
    })

    describe("buildAutomaticColumns", () => {
      it("should build columns from items with default layout", async () => {
        const { service } = buildService()

        const items = [
          { label: "Item 1", href: "/item1" },
          { label: "Item 2", href: "/item2" }
        ]

        const result = await service["buildAutomaticColumns"](
          items,
          "simple-dropdown",
          null
        )

        expect(result).toHaveLength(1)
        expect(result[0].items).toHaveLength(2)
      })

      it("should chunk items for thumbnail-grid layout", async () => {
        const { service } = buildService()

        const items = [
          { label: "Item 1", href: "/item1" },
          { label: "Item 2", href: "/item2" },
          { label: "Item 3", href: "/item3" },
          { label: "Item 4", href: "/item4" },
          { label: "Item 5", href: "/item5" },
          { label: "Item 6", href: "/item6" },
          { label: "Item 7", href: "/item7" }
        ]

        const result = await service["buildAutomaticColumns"](
          items,
          "thumbnail-grid",
          null
        )

        expect(result).toHaveLength(3) // 7 items / 3 per chunk = 3 columns
        expect(result[0].items).toHaveLength(3)
        expect(result[1].items).toHaveLength(3)
        expect(result[2].items).toHaveLength(1)
      })

      it("should use autoHeading from metadata", async () => {
        const { service } = buildService()

        const items = [
          { label: "Item 1", href: "/item1" }
        ]

        const result = await service["buildAutomaticColumns"](
          items,
          "simple-dropdown",
          { autoHeading: "Auto Heading" }
        )

        expect(result[0].heading).toBe("Auto Heading")
      })

      it("should return empty array for empty items", async () => {
        const { service } = buildService()

        const result = await service["buildAutomaticColumns"](
          [],
          "simple-dropdown",
          null
        )

        expect(result).toHaveLength(0)
      })

      it("should include subcategory config in thumbnail-grid columns", async () => {
        const { service } = buildService()

        const items = [
          { label: "Item 1", href: "/item1" },
          { label: "Item 2", href: "/item2" },
          { label: "Item 3", href: "/item3" }
        ]

        const configMap = new Map([
          ["cat_1", {
            id: "config_1",
            categoryId: "cat_1",
            columnLayout: "image-with-text" as const,
            columnBadge: "featured" as const,
            defaultMenuLayout: null,
            menuLayout: null,
            tagline: null,
            columns: [],
            featured: [],
            submenuCategoryIds: [],
            metadata: null,
            displayAsColumn: null,
            columnTitle: null,
            columnDescription: null,
            columnImageUrl: null,
            columnImageSource: null,
            icon: null,
            thumbnailUrl: null,
            selectedThumbnailProductId: null,
            selectedThumbnailImageId: null,
            title: null,
            subtitle: null,
            excludedFromMenu: false,
            layout: null,
            displayMode: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]
        ])

        const result = await service["buildAutomaticColumns"](
          items,
          "thumbnail-grid",
          null,
          configMap,
          ["cat_1", "cat_2", "cat_3"]
        )

        expect(result[0].columnLayout).toBe("image-with-text")
        expect(result[0].badge).toBe("featured")
        expect(result[0].categoryId).toBe("cat_1")
      })
    })
  })

  describe("Link Transformation", () => {
    describe("buildLinks", () => {
      it("should build links from link configs", () => {
        const { service } = buildService()

        const items: MegaMenuLinkConfig[] = [
          { label: "Link 1", href: "/link1" },
          { label: "Link 2", href: "/link2", description: "Description 2" }
        ]

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = service["buildLinks"](items, categoryMap)

        expect(result).toHaveLength(2)
        expect(result[0].label).toBe("Link 1")
        expect(result[1].description).toBe("Description 2")
      })

      it("should filter out invalid links", () => {
        const { service } = buildService()

        const items: MegaMenuLinkConfig[] = [
          { label: "Valid", href: "/valid" },
          { label: null, href: "/invalid" },
          { label: "Invalid", href: null }
        ]

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result = service["buildLinks"](items, categoryMap)

        expect(result).toHaveLength(1)
      })

      it("should handle null or undefined items", () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result1 = service["buildLinks"](null, categoryMap)
        const result2 = service["buildLinks"](undefined, categoryMap)

        expect(result1).toHaveLength(0)
        expect(result2).toHaveLength(0)
      })
    })

    describe("transformLink", () => {
      it("should transform link with categoryId reference", () => {
        const { service } = buildService()

        const category = buildCategory({
          id: "cat_1",
          name: "Category Name",
          handle: "category-handle",
          description: "Category description"
        })

        const categoryMap = new Map([[category.id, category]])

        const item: MegaMenuLinkConfig = {
          categoryId: "cat_1"
        }

        const result = service["transformLink"](item, categoryMap)

        expect(result).not.toBeNull()
        expect(result?.label).toBe("Category Name")
        expect(result?.href).toBe("/store?category=category-handle")
        expect(result?.description).toBe("Category description")
      })

      it("should override category fields with item fields", () => {
        const { service } = buildService()

        const category = buildCategory({
          id: "cat_1",
          name: "Category Name",
          handle: "category-handle",
          description: "Category description"
        })

        const categoryMap = new Map([[category.id, category]])

        const item: MegaMenuLinkConfig = {
          categoryId: "cat_1",
          label: "Override Label",
          href: "/override-href",
          description: "Override description"
        }

        const result = service["transformLink"](item, categoryMap)

        expect(result?.label).toBe("Override Label")
        expect(result?.href).toBe("/override-href")
        expect(result?.description).toBe("Override description")
      })

      it("should return null when categoryId not found in map", () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const item: MegaMenuLinkConfig = {
          categoryId: "missing_category"
        }

        const result = service["transformLink"](item, categoryMap)

        expect(result).toBeNull()
      })

      it("should transform manual link without categoryId", () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const item: MegaMenuLinkConfig = {
          label: "Manual Link",
          href: "/manual-href",
          description: "Manual description",
          badge: "new",
          icon: "ShoppingBag",
          thumbnailUrl: "https://example.com/thumb.jpg"
        }

        const result = service["transformLink"](item, categoryMap)

        expect(result).not.toBeNull()
        expect(result?.label).toBe("Manual Link")
        expect(result?.href).toBe("/manual-href")
        expect(result?.description).toBe("Manual description")
        expect(result?.badge).toBe("new")
        expect(result?.icon).toBe("ShoppingBag")
        expect(result?.thumbnailUrl).toBe("https://example.com/thumb.jpg")
      })

      it("should return null when manual link missing label or href", () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const item1: MegaMenuLinkConfig = {
          label: "Label only"
        }

        const item2: MegaMenuLinkConfig = {
          href: "/href-only"
        }

        const result1 = service["transformLink"](item1, categoryMap)
        const result2 = service["transformLink"](item2, categoryMap)

        expect(result1).toBeNull()
        expect(result2).toBeNull()
      })

      it("should handle null or undefined item", () => {
        const { service } = buildService()

        const categoryMap = new Map<string, ProductCategoryDTO>()

        const result1 = service["transformLink"](null, categoryMap)
        const result2 = service["transformLink"](undefined, categoryMap)

        expect(result1).toBeNull()
        expect(result2).toBeNull()
      })
    })

    describe("resolveCategoryLabel", () => {
      it("should use name as label", () => {
        const { service } = buildService()

        const category = buildCategory({
          name: "Category Name",
          handle: "handle",
          id: "cat_123"
        })

        const result = service["resolveCategoryLabel"](category)

        expect(result).toBe("Category Name")
      })

      it("should fall back to handle when name is empty", () => {
        const { service } = buildService()

        const category = buildCategory({
          name: "",
          handle: "category-handle",
          id: "cat_123"
        })

        const result = service["resolveCategoryLabel"](category)

        expect(result).toBe("category-handle")
      })

      it("should fall back to id when name and handle are empty", () => {
        const { service } = buildService()

        const category = buildCategory({
          name: "",
          handle: "",
          id: "cat_123"
        })

        const result = service["resolveCategoryLabel"](category)

        expect(result).toBe("cat_123")
      })

      it("should trim whitespace from name", () => {
        const { service } = buildService()

        const category = buildCategory({
          name: "  Category Name  ",
          handle: "handle",
          id: "cat_123"
        })

        const result = service["resolveCategoryLabel"](category)

        expect(result).toBe("Category Name")
      })
    })

    describe("resolveCategoryHref", () => {
      it("should use handle in href", () => {
        const { service } = buildService()

        const category = buildCategory({
          handle: "category-handle",
          id: "cat_123"
        })

        const result = service["resolveCategoryHref"](category)

        expect(result).toBe("/store?category=category-handle")
      })

      it("should fall back to id when handle is empty", () => {
        const { service } = buildService()

        const category = buildCategory({
          handle: "",
          id: "cat_123"
        })

        const result = service["resolveCategoryHref"](category)

        expect(result).toBe("/store?category=cat_123")
      })

      it("should use custom baseHref from options", () => {
        const { service } = buildService({ baseHref: "/categories/" })

        const category = buildCategory({
          handle: "category-handle",
          id: "cat_123"
        })

        const result = service["resolveCategoryHref"](category)

        expect(result).toBe("/categories/category-handle")
      })

      it("should encode URI components", () => {
        const { service } = buildService()

        const category = buildCategory({
          handle: "category with spaces",
          id: "cat_123"
        })

        const result = service["resolveCategoryHref"](category)

        expect(result).toBe("/store?category=category%20with%20spaces")
      })

      it("should return null when both handle and id are empty", () => {
        const { service } = buildService()

        const category = buildCategory({
          handle: "",
          id: ""
        })

        const result = service["resolveCategoryHref"](category)

        expect(result).toBeNull()
      })
    })
  })

  describe("Data Normalization", () => {
    describe("normalizePayload", () => {
      it("should normalize all fields correctly", () => {
        const { service } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: "  cat_123  ",
          defaultMenuLayout: "rich-columns",
          menuLayout: "simple-dropdown",
          tagline: "  Tagline  ",
          columns: [
            {
              heading: "Column",
              items: [{ label: "Link", href: "/link" }]
            }
          ],
          featured: [
            {
              label: "Featured",
              href: "/featured"
            }
          ],
          submenuCategoryIds: ["cat_1", "cat_2"],
          metadata: { key: "value" },
          displayAsColumn: true,
          columnTitle: "  Title  ",
          columnDescription: "  Description  ",
          columnImageUrl: "  https://example.com/image.jpg  ",
          columnImageSource: "upload",
          columnBadge: "new",
          icon: "  ShoppingBag  ",
          thumbnailUrl: "  https://example.com/thumb.jpg  ",
          selectedThumbnailProductId: "  prod_123  ",
          selectedThumbnailImageId: "  img_123  ",
          title: "  Display Title  ",
          subtitle: "  Display Subtitle  ",
          excludedFromMenu: true,
          layout: "thumbnail-grid",
          displayMode: "columns",
          columnLayout: "image-with-text"
        }

        const result = service["normalizePayload"](input)

        expect(result.category_id).toBe("cat_123")
        expect(result.default_menu_layout).toBe("rich-columns")
        expect(result.menu_layout).toBe("simple-dropdown")
        expect(result.tagline).toBe("Tagline")
        expect(result.columns).toHaveLength(1)
        expect(result.featured).toHaveLength(1)
        expect(result.submenu_category_ids).toEqual(["cat_1", "cat_2"])
        expect(result.metadata).toEqual({ key: "value" })
        expect(result.display_as_column).toBe(true)
        expect(result.column_title).toBe("Title")
        expect(result.column_description).toBe("Description")
        expect(result.column_image_url).toBe("https://example.com/image.jpg")
        expect(result.column_image_source).toBe("upload")
        expect(result.column_badge).toBe("new")
        expect(result.icon).toBe("ShoppingBag")
        expect(result.thumbnail_url).toBe("https://example.com/thumb.jpg")
        expect(result.selected_thumbnail_product_id).toBe("prod_123")
        expect(result.selected_thumbnail_image_id).toBe("img_123")
        expect(result.title).toBe("Display Title")
        expect(result.subtitle).toBe("Display Subtitle")
        expect(result.excluded_from_menu).toBe(true)
        expect(result.layout).toBe("thumbnail-grid")
        expect(result.display_mode).toBe("columns")
        expect(result.column_layout).toBe("image-with-text")
      })

      it("should throw error when categoryId is empty", () => {
        const { service } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: ""
        }

        expect(() => service["normalizePayload"](input)).toThrow(MedusaError)
      })

      it("should convert empty strings to null", () => {
        const { service } = buildService()

        const input: MegaMenuConfigInput = {
          categoryId: "cat_123",
          tagline: "   ",
          columnTitle: ""
        }

        const result = service["normalizePayload"](input)

        expect(result.tagline).toBeNull()
        expect(result.column_title).toBeNull()
      })
    })

    describe("normalizeColumns", () => {
      it("should normalize column configs", () => {
        const { service } = buildService()

        const columns: MegaMenuColumnConfig[] = [
          {
            heading: "  Heading  ",
            description: "  Description  ",
            imageUrl: "  https://example.com/image.jpg  ",
            items: [
              { label: "  Link  ", href: "  /link  " }
            ]
          }
        ]

        const result = service["normalizeColumns"](columns)

        expect(result).toHaveLength(1)
        expect(result[0].heading).toBe("Heading")
        expect(result[0].description).toBe("Description")
        expect(result[0].imageUrl).toBe("https://example.com/image.jpg")
        expect(result[0].items).toHaveLength(1)
      })

      it("should return empty array for null or undefined", () => {
        const { service } = buildService()

        const result1 = service["normalizeColumns"](null)
        const result2 = service["normalizeColumns"](undefined)

        expect(result1).toEqual([])
        expect(result2).toEqual([])
      })
    })

    describe("normalizeLinkConfigs", () => {
      it("should normalize link configs", () => {
        const { service } = buildService()

        const items: MegaMenuLinkConfig[] = [
          {
            label: "  Label  ",
            href: "  /href  ",
            description: "  Description  ",
            badge: "  new  ",
            icon: "  ShoppingBag  ",
            thumbnailUrl: "  https://example.com/thumb.jpg  ",
            categoryId: "  cat_123  ",
            metadata: { key: "value" }
          }
        ]

        const result = service["normalizeLinkConfigs"](items)

        expect(result).toHaveLength(1)
        expect(result[0].label).toBe("Label")
        expect(result[0].href).toBe("/href")
        expect(result[0].description).toBe("Description")
        expect(result[0].badge).toBe("new")
        expect(result[0].icon).toBe("ShoppingBag")
        expect(result[0].thumbnailUrl).toBe("https://example.com/thumb.jpg")
        expect(result[0].categoryId).toBe("cat_123")
        expect(result[0].metadata).toEqual({ key: "value" })
      })

      it("should return empty array for null or undefined", () => {
        const { service } = buildService()

        const result1 = service["normalizeLinkConfigs"](null)
        const result2 = service["normalizeLinkConfigs"](undefined)

        expect(result1).toEqual([])
        expect(result2).toEqual([])
      })
    })

    describe("normalizeFeatured", () => {
      it("should normalize featured card configs", () => {
        const { service } = buildService()

        const featured: MegaMenuFeaturedCardConfig[] = [
          {
            eyebrow: "  Eyebrow  ",
            label: "  Label  ",
            href: "  /href  ",
            description: "  Description  ",
            ctaLabel: "  CTA  ",
            imageUrl: "  https://example.com/image.jpg  ",
            metadata: { key: "value" }
          }
        ]

        const result = service["normalizeFeatured"](featured)

        expect(result).toHaveLength(1)
        expect(result[0].eyebrow).toBe("Eyebrow")
        expect(result[0].label).toBe("Label")
        expect(result[0].href).toBe("/href")
        expect(result[0].description).toBe("Description")
        expect(result[0].ctaLabel).toBe("CTA")
        expect(result[0].imageUrl).toBe("https://example.com/image.jpg")
        expect(result[0].metadata).toEqual({ key: "value" })
      })

      it("should return empty array for null or undefined", () => {
        const { service } = buildService()

        const result1 = service["normalizeFeatured"](null)
        const result2 = service["normalizeFeatured"](undefined)

        expect(result1).toEqual([])
        expect(result2).toEqual([])
      })
    })

    describe("normalizeSubmenuCategoryIds", () => {
      it("should deduplicate and filter category IDs", () => {
        const { service } = buildService()

        const ids = ["cat_1", "cat_2", "cat_1", "  cat_3  ", "", "   ", null as any]

        const result = service["normalizeSubmenuCategoryIds"](ids)

        expect(result).toEqual(["cat_1", "cat_2", "cat_3"])
      })

      it("should return empty array for null or undefined", () => {
        const { service } = buildService()

        const result1 = service["normalizeSubmenuCategoryIds"](null)
        const result2 = service["normalizeSubmenuCategoryIds"](undefined)

        expect(result1).toEqual([])
        expect(result2).toEqual([])
      })
    })

    describe("normalizeMetadata", () => {
      it("should return metadata object unchanged", () => {
        const { service } = buildService()

        const metadata = { key1: "value1", key2: 123 }

        const result = service["normalizeMetadata"](metadata)

        expect(result).toEqual(metadata)
      })

      it("should return null for non-objects", () => {
        const { service } = buildService()

        const result1 = service["normalizeMetadata"](null)
        const result2 = service["normalizeMetadata"](undefined)
        const result3 = service["normalizeMetadata"]("string" as any)
        const result4 = service["normalizeMetadata"](123 as any)
        const result5 = service["normalizeMetadata"]([] as any)

        expect(result1).toBeNull()
        expect(result2).toBeNull()
        expect(result3).toBeNull()
        expect(result4).toBeNull()
        expect(result5).toBeNull()
      })
    })
  })

  describe("DTO Conversion", () => {
    describe("toDTO", () => {
      it("should convert entity to DTO", () => {
        const { service } = buildService()

        const entity = {
          id: "config_123",
          category_id: "cat_123",
          default_menu_layout: "rich-columns",
          menu_layout: "simple-dropdown",
          tagline: "Tagline",
          columns: [
            { heading: "Column", items: [] }
          ],
          featured: [
            { label: "Featured", href: "/featured" }
          ],
          submenu_category_ids: ["cat_1", "cat_2"],
          metadata: { key: "value" },
          display_as_column: true,
          column_title: "Title",
          column_description: "Description",
          column_image_url: "https://example.com/image.jpg",
          column_image_source: "upload",
          column_badge: "new",
          icon: "ShoppingBag",
          thumbnail_url: "https://example.com/thumb.jpg",
          selected_thumbnail_product_id: "prod_123",
          selected_thumbnail_image_id: "img_123",
          title: "Display Title",
          subtitle: "Display Subtitle",
          excluded_from_menu: true,
          layout: "thumbnail-grid",
          display_mode: "columns",
          column_layout: "image-with-text",
          created_at: new Date(),
          updated_at: new Date(),
        }

        const result = service["toDTO"](entity as any)

        expect(result.id).toBe("config_123")
        expect(result.categoryId).toBe("cat_123")
        expect(result.defaultMenuLayout).toBe("rich-columns")
        expect(result.menuLayout).toBe("simple-dropdown")
        expect(result.tagline).toBe("Tagline")
        expect(result.columns).toHaveLength(1)
        expect(result.featured).toHaveLength(1)
        expect(result.submenuCategoryIds).toEqual(["cat_1", "cat_2"])
        expect(result.metadata).toEqual({ key: "value" })
        expect(result.displayAsColumn).toBe(true)
        expect(result.columnTitle).toBe("Title")
        expect(result.columnDescription).toBe("Description")
        expect(result.columnImageUrl).toBe("https://example.com/image.jpg")
        expect(result.columnImageSource).toBe("upload")
        expect(result.columnBadge).toBe("new")
        expect(result.icon).toBe("ShoppingBag")
        expect(result.thumbnailUrl).toBe("https://example.com/thumb.jpg")
        expect(result.selectedThumbnailProductId).toBe("prod_123")
        expect(result.selectedThumbnailImageId).toBe("img_123")
        expect(result.title).toBe("Display Title")
        expect(result.subtitle).toBe("Display Subtitle")
        expect(result.excludedFromMenu).toBe(true)
        expect(result.layout).toBe("thumbnail-grid")
        expect(result.displayMode).toBe("columns")
        expect(result.columnLayout).toBe("image-with-text")
      })

      it("should handle null and undefined array fields", () => {
        const { service } = buildService()

        const entity = {
          id: "config_123",
          category_id: "cat_123",
          columns: null,
          featured: undefined,
          submenu_category_ids: null,
          metadata: null,
          default_menu_layout: null,
          menu_layout: null,
          tagline: null,
          display_as_column: null,
          column_title: null,
          column_description: null,
          column_image_url: null,
          column_image_source: null,
          column_badge: null,
          icon: null,
          thumbnail_url: null,
          selected_thumbnail_product_id: null,
          selected_thumbnail_image_id: null,
          title: null,
          subtitle: null,
          excluded_from_menu: false,
          layout: null,
          display_mode: null,
          column_layout: null,
          created_at: new Date(),
          updated_at: new Date(),
        }

        const result = service["toDTO"](entity as any)

        expect(result.columns).toEqual([])
        expect(result.featured).toEqual([])
        expect(result.submenuCategoryIds).toEqual([])
        expect(result.metadata).toBeNull()
      })
    })

    describe("getDefaults", () => {
      it("should return default options", () => {
        const { service } = buildService({
          defaultLayout: "rich-columns",
          baseHref: "/categories/"
        })

        const result = service.getDefaults()

        expect(result.defaultMenuLayout).toBe("rich-columns")
        expect(result.baseHref).toBe("/categories/")
      })

      it("should use built-in defaults when no options provided", () => {
        const { service } = buildService()

        const result = service.getDefaults()

        expect(result.defaultMenuLayout).toBe("simple-dropdown")
        expect(result.baseHref).toBe("/store?category=")
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle all null input gracefully", async () => {
      const { service, mocks } = buildService()

      const input: MegaMenuConfigInput = {
        categoryId: "cat_123",
        menuLayout: null,
        tagline: null,
        columns: null,
        featured: null,
        submenuCategoryIds: null,
        metadata: null
      }

      const mockCreated = {
        id: "config_123",
        category_id: "cat_123",
        menu_layout: null,
        tagline: null,
        columns: [],
        featured: [],
        submenu_category_ids: [],
        metadata: null,
        display_as_column: null,
        column_title: null,
        column_description: null,
        column_image_url: null,
        column_image_source: null,
        column_badge: null,
        icon: null,
        thumbnail_url: null,
        selected_thumbnail_product_id: null,
        selected_thumbnail_image_id: null,
        title: null,
        subtitle: null,
        excluded_from_menu: false,
        layout: null,
        display_mode: null,
        column_layout: null,
        default_menu_layout: null,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mocks.listMegaMenuConfigs.mockResolvedValue([])
      mocks.createMegaMenuConfigs.mockResolvedValue(mockCreated)

      await expect(service.upsertCategoryConfig(input)).resolves.not.toThrow()
    })

    it("should handle invalid layout types gracefully", () => {
      const { service } = buildService({ defaultLayout: "invalid" as any })

      const defaults = service.getDefaults()

      expect(defaults.defaultMenuLayout).toBe("simple-dropdown")
    })

    it("should normalize baseHref option", () => {
      const { service } = buildService({ baseHref: "   /custom/   " })

      const defaults = service.getDefaults()

      expect(defaults.baseHref).toBe("/custom/")
    })

    it("should use default baseHref when empty", () => {
      const { service } = buildService({ baseHref: "   " })

      const defaults = service.getDefaults()

      expect(defaults.baseHref).toBe("/store?category=")
    })
  })
})
