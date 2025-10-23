import CategorySelectorByProductService, {
  CATEGORY_SELECTOR_GLOBAL_ID
} from "../../service"
import {
  CategorySelectorConfigDTO,
  CategorySelectorConfigUpsertDTO,
  CategorySelectorPresentationConfig,
  DEFAULT_CATEGORY_SELECTOR_PRESENTATION
} from "../../types"
import { MedusaError } from "@medusajs/framework/utils"

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Helper to create a mock entity response
const buildMockEntity = (overrides: Partial<any> = {}): any => {
  return {
    id: "config_test_123",
    category_id: "cat_123",
    mode: "random_product",
    custom_image_url: null,
    selected_product_id: null,
    selected_product_image_id: null,
    random_product_ids: null,
    metadata: { presentation: { ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION } },
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }
}

describe("CategorySelectorByProductService", () => {
  let service: CategorySelectorByProductService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CategorySelectorByProductService({
      logger: mockLogger as any,
    })
  })

  describe("Configuration CRUD Operations", () => {
    describe("upsertCategoryConfig", () => {
      describe("custom_image mode", () => {
        it("should create new configuration with custom_image mode", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_123",
            mode: "custom_image",
            custom_image_url: "https://example.com/image.jpg",
          }

          // Mock no existing config
          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          // Mock create
          const mockCreated = buildMockEntity({
            category_id: "cat_123",
            mode: "custom_image",
            custom_image_url: "https://example.com/image.jpg",
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result).toMatchObject({
            id: "config_test_123",
            category_id: "cat_123",
            mode: "custom_image",
            custom_image_url: "https://example.com/image.jpg",
            selected_product_id: null,
            selected_product_image_id: null,
            random_product_ids: null,
          })
        })

        it("should allow null custom_image_url", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_456",
            mode: "custom_image",
            custom_image_url: null,
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_456",
            mode: "custom_image",
            custom_image_url: null,
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result.custom_image_url).toBeNull()
        })
      })

      describe("product_image mode", () => {
        it("should create configuration with product_image mode", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_789",
            mode: "product_image",
            selected_product_id: "prod_123",
            selected_product_image_id: "img_456",
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_789",
            mode: "product_image",
            selected_product_id: "prod_123",
            selected_product_image_id: "img_456",
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result).toMatchObject({
            category_id: "cat_789",
            mode: "product_image",
            selected_product_id: "prod_123",
            selected_product_image_id: "img_456",
            custom_image_url: null,
            random_product_ids: null,
          })
        })

        it("should throw error when selected_product_id is missing", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_fail",
            mode: "product_image",
            selected_product_image_id: "img_456",
          }

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            "A product must be selected when using the product image mode."
          )
        })

        it("should throw error when selected_product_image_id is missing", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_fail",
            mode: "product_image",
            selected_product_id: "prod_123",
          }

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            "An image must be chosen when using the product image mode."
          )
        })

        it("should throw error when both product and image IDs are missing", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_fail",
            mode: "product_image",
          }

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
        })
      })

      describe("random_product mode", () => {
        it("should create configuration with random_product mode and product IDs", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_random",
            mode: "random_product",
            random_product_ids: ["prod_1", "prod_2", "prod_3"],
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_random",
            mode: "random_product",
            random_product_ids: ["prod_1", "prod_2", "prod_3"],
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result).toMatchObject({
            category_id: "cat_random",
            mode: "random_product",
            random_product_ids: ["prod_1", "prod_2", "prod_3"],
            custom_image_url: null,
            selected_product_id: null,
            selected_product_image_id: null,
          })
        })

        it("should deduplicate random_product_ids", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_dedup",
            mode: "random_product",
            random_product_ids: ["prod_1", "prod_2", "prod_1", "prod_3", "prod_2"],
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_dedup",
            mode: "random_product",
            random_product_ids: ["prod_1", "prod_2", "prod_3"],
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result.random_product_ids).toHaveLength(3)
          expect(result.random_product_ids).toEqual(
            expect.arrayContaining(["prod_1", "prod_2", "prod_3"])
          )
        })

        it("should filter out falsy values from random_product_ids", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_filter",
            mode: "random_product",
            random_product_ids: ["prod_1", "", null, "prod_2", undefined, "prod_3"] as any,
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_filter",
            mode: "random_product",
            random_product_ids: ["prod_1", "prod_2", "prod_3"],
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result.random_product_ids).toEqual(["prod_1", "prod_2", "prod_3"])
        })

        it("should warn when random_product_ids array is empty", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_empty",
            mode: "random_product",
            random_product_ids: [],
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_empty",
            mode: "random_product",
            random_product_ids: [],
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          await service.upsertCategoryConfig(input)

          expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining("random pool for category cat_empty is empty")
          )
        })

        it("should warn when random_product_ids only contains falsy values", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_only_falsy",
            mode: "random_product",
            random_product_ids: ["", null, undefined] as any,
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_only_falsy",
            mode: "random_product",
            random_product_ids: [],
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          await service.upsertCategoryConfig(input)

          expect(mockLogger.warn).toHaveBeenCalled()
        })
      })

      describe("mode validation", () => {
        it("should reject invalid mode", async () => {
          const input = {
            category_id: "cat_invalid",
            mode: "invalid_mode",
          } as any

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            'Unsupported representation mode "invalid_mode"'
          )
        })

        it("should accept all valid modes", async () => {
          const validModes = ["custom_image", "product_image", "random_product"]

          for (const mode of validModes) {
            jest.clearAllMocks()

            const input: any = {
              category_id: `cat_${mode}`,
              mode,
            }

            // Add required fields for product_image mode
            if (mode === "product_image") {
              input.selected_product_id = "prod_123"
              input.selected_product_image_id = "img_456"
            }

            jest
              .spyOn(service, "listCategorySelectorByProductConfigs")
              .mockResolvedValue([])

            jest
              .spyOn(service, "createCategorySelectorByProductConfigs")
              .mockResolvedValue(buildMockEntity({ mode }))

            await expect(service.upsertCategoryConfig(input)).resolves.toMatchObject({
              mode,
            })
          }
        })
      })

      describe("category_id validation", () => {
        it("should throw error when category_id is missing", async () => {
          const input = {
            mode: "random_product",
          } as any

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            "Category ID is required"
          )
        })

        it("should throw error when category_id is empty string", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "",
            mode: "random_product",
          }

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
        })

        it("should throw error when category_id is only whitespace", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "   ",
            mode: "random_product",
          }

          await expect(service.upsertCategoryConfig(input)).rejects.toThrow(
            MedusaError
          )
        })

        it("should trim category_id whitespace", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "  cat_trim  ",
            mode: "random_product",
          }

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([])

          const mockCreated = buildMockEntity({
            category_id: "cat_trim",
          })
          jest
            .spyOn(service, "createCategorySelectorByProductConfigs")
            .mockResolvedValue(mockCreated)

          const result = await service.upsertCategoryConfig(input)

          expect(result.category_id).toBe("cat_trim")
        })
      })

      describe("update existing configuration", () => {
        it("should update existing configuration instead of creating new one", async () => {
          const input: CategorySelectorConfigUpsertDTO = {
            category_id: "cat_existing",
            mode: "custom_image",
            custom_image_url: "https://example.com/new.jpg",
          }

          const existingConfig = buildMockEntity({
            id: "config_existing",
            category_id: "cat_existing",
            mode: "random_product",
          })

          jest
            .spyOn(service, "listCategorySelectorByProductConfigs")
            .mockResolvedValue([existingConfig])

          const mockUpdated = buildMockEntity({
            id: "config_existing",
            category_id: "cat_existing",
            mode: "custom_image",
            custom_image_url: "https://example.com/new.jpg",
          })
          jest
            .spyOn(service, "updateCategorySelectorByProductConfigs")
            .mockResolvedValue(mockUpdated)

          const createSpy = jest.spyOn(
            service,
            "createCategorySelectorByProductConfigs"
          )

          const result = await service.upsertCategoryConfig(input)

          expect(result.id).toBe("config_existing")
          expect(result.mode).toBe("custom_image")
          expect(createSpy).not.toHaveBeenCalled()
        })
      })
    })

    describe("deleteCategoryConfig", () => {
      it("should delete existing configuration", async () => {
        const existingConfig = buildMockEntity({
          id: "config_delete",
          category_id: "cat_delete",
        })

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue([existingConfig])

        const deleteSpy = jest
          .spyOn(service, "deleteCategorySelectorByProductConfigs")
          .mockResolvedValue(undefined)

        await service.deleteCategoryConfig("cat_delete")

        expect(deleteSpy).toHaveBeenCalledWith("config_delete")
      })

      it("should not throw error when configuration does not exist", async () => {
        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue([])

        const deleteSpy = jest.spyOn(
          service,
          "deleteCategorySelectorByProductConfigs"
        )

        await expect(
          service.deleteCategoryConfig("cat_nonexistent")
        ).resolves.toBeUndefined()

        expect(deleteSpy).not.toHaveBeenCalled()
      })
    })

    describe("getCategoryConfig", () => {
      it("should return configuration when it exists", async () => {
        const mockConfig = buildMockEntity({
          category_id: "cat_get",
        })

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue([mockConfig])

        const result = await service.getCategoryConfig("cat_get")

        expect(result).toMatchObject({
          id: "config_test_123",
          category_id: "cat_get",
        })
      })

      it("should return null when configuration does not exist", async () => {
        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue([])

        const result = await service.getCategoryConfig("cat_nonexistent")

        expect(result).toBeNull()
      })
    })

    describe("getCategoryConfigMap", () => {
      it("should return map of configurations for multiple categories", async () => {
        const mockConfigs = [
          buildMockEntity({
            id: "config_1",
            category_id: "cat_1",
          }),
          buildMockEntity({
            id: "config_2",
            category_id: "cat_2",
          }),
          buildMockEntity({
            id: "config_3",
            category_id: "cat_3",
          }),
        ]

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue(mockConfigs)

        const result = await service.getCategoryConfigMap(["cat_1", "cat_2", "cat_3"])

        expect(result.size).toBe(3)
        expect(result.get("cat_1")).toMatchObject({
          id: "config_1",
          category_id: "cat_1",
        })
        expect(result.get("cat_2")).toMatchObject({
          id: "config_2",
          category_id: "cat_2",
        })
        expect(result.get("cat_3")).toMatchObject({
          id: "config_3",
          category_id: "cat_3",
        })
      })

      it("should return empty map when no category IDs provided", async () => {
        const listSpy = jest.spyOn(service, "listCategorySelectorByProductConfigs")

        const result = await service.getCategoryConfigMap([])

        expect(result.size).toBe(0)
        expect(listSpy).not.toHaveBeenCalled()
      })

      it("should only include categories that have configurations", async () => {
        const mockConfigs = [
          buildMockEntity({
            id: "config_1",
            category_id: "cat_1",
          }),
        ]

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue(mockConfigs)

        const result = await service.getCategoryConfigMap([
          "cat_1",
          "cat_2",
          "cat_3",
        ])

        expect(result.size).toBe(1)
        expect(result.has("cat_1")).toBe(true)
        expect(result.has("cat_2")).toBe(false)
        expect(result.has("cat_3")).toBe(false)
      })
    })
  })

  describe("Presentation Configuration", () => {
    describe("getGlobalPresentation", () => {
      it("should return default presentation when no global config exists", async () => {
        jest.spyOn(service, "getCategoryConfig").mockResolvedValue(null)

        const result = await service.getGlobalPresentation()

        expect(result).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should return configured presentation when global config exists", async () => {
        const customPresentation: CategorySelectorPresentationConfig = {
          enabled: false,
          scale_mode: "fit_width",
          style: "carousel",
          max_rows: 3,
          max_columns: 4,
          randomize_visible_categories: true,
        }

        const mockConfig: CategorySelectorConfigDTO = {
          id: "global_config",
          category_id: CATEGORY_SELECTOR_GLOBAL_ID,
          mode: "random_product",
          presentation: customPresentation,
          metadata: { presentation: customPresentation },
        }

        jest.spyOn(service, "getCategoryConfig").mockResolvedValue(mockConfig)

        const result = await service.getGlobalPresentation()

        expect(result).toEqual(customPresentation)
      })

      it("should return copy of presentation config (not reference)", async () => {
        const mockConfig: CategorySelectorConfigDTO = {
          id: "global_config",
          category_id: CATEGORY_SELECTOR_GLOBAL_ID,
          mode: "random_product",
          presentation: { ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION },
          metadata: {},
        }

        jest.spyOn(service, "getCategoryConfig").mockResolvedValue(mockConfig)

        const result = await service.getGlobalPresentation()

        // Mutate result
        result.enabled = false

        // Get again and verify it's unchanged
        const result2 = await service.getGlobalPresentation()
        expect(result2.enabled).toBe(true)
      })
    })

    describe("updateGlobalPresentation", () => {
      it("should update global presentation configuration", async () => {
        const newPresentation: Partial<CategorySelectorPresentationConfig> = {
          enabled: false,
          scale_mode: "fit_height",
          style: "flips",
        }

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValueOnce([]) // For upsert check
          .mockResolvedValueOnce([]) // For cascade check

        const mockCreated = buildMockEntity({
          category_id: CATEGORY_SELECTOR_GLOBAL_ID,
          mode: "random_product",
          metadata: {
            presentation: {
              ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION,
              enabled: false,
              scale_mode: "fit_height",
              style: "flips",
            },
          },
        })
        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(mockCreated)

        const result = await service.updateGlobalPresentation(newPresentation)

        expect(result).toMatchObject({
          enabled: false,
          scale_mode: "fit_height",
          style: "flips",
        })
      })

      it("should cascade global presentation to all other category configs", async () => {
        const newPresentation: Partial<CategorySelectorPresentationConfig> = {
          max_rows: 5,
          max_columns: 3,
        }

        const existingConfigs = [
          buildMockEntity({
            id: "config_1",
            category_id: "cat_1",
          }),
          buildMockEntity({
            id: "config_2",
            category_id: "cat_2",
          }),
        ]

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValueOnce([]) // For upsert check
          .mockResolvedValueOnce(existingConfigs) // For cascade

        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(
            buildMockEntity({
              category_id: CATEGORY_SELECTOR_GLOBAL_ID,
            })
          )

        const updateSpy = jest
          .spyOn(service, "updateCategorySelectorByProductConfigs")
          .mockResolvedValue(buildMockEntity())

        await service.updateGlobalPresentation(newPresentation)

        expect(updateSpy).toHaveBeenCalledTimes(2)
      })

      it("should not update global config in cascade", async () => {
        const newPresentation: Partial<CategorySelectorPresentationConfig> = {
          enabled: false,
        }

        const configs = [
          buildMockEntity({
            id: "global_config",
            category_id: CATEGORY_SELECTOR_GLOBAL_ID,
          }),
          buildMockEntity({
            id: "config_1",
            category_id: "cat_1",
          }),
        ]

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValueOnce([]) // For upsert check
          .mockResolvedValueOnce(configs) // For cascade

        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(
            buildMockEntity({
              category_id: CATEGORY_SELECTOR_GLOBAL_ID,
            })
          )

        const updateSpy = jest
          .spyOn(service, "updateCategorySelectorByProductConfigs")
          .mockResolvedValue(buildMockEntity())

        await service.updateGlobalPresentation(newPresentation)

        // Should only update cat_1, not global
        expect(updateSpy).toHaveBeenCalledTimes(1)
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ id: "config_1" })
        )
      })

      it("should handle null presentation input", async () => {
        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])

        const mockCreated = buildMockEntity({
          category_id: CATEGORY_SELECTOR_GLOBAL_ID,
        })
        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(mockCreated)

        const result = await service.updateGlobalPresentation(null)

        expect(result).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should handle undefined presentation input", async () => {
        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])

        const mockCreated = buildMockEntity({
          category_id: CATEGORY_SELECTOR_GLOBAL_ID,
        })
        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(mockCreated)

        const result = await service.updateGlobalPresentation(undefined)

        expect(result).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })
    })

    describe("normalizePresentationConfig", () => {
      it("should return default presentation for null input", () => {
        const result = (service as any).normalizePresentationConfig(null)
        expect(result).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should return default presentation for undefined input", () => {
        const result = (service as any).normalizePresentationConfig(undefined)
        expect(result).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should merge partial presentation with defaults", () => {
        const partial: Partial<CategorySelectorPresentationConfig> = {
          enabled: false,
          scale_mode: "fit_width",
        }

        const result = (service as any).normalizePresentationConfig(partial)

        expect(result).toEqual({
          ...DEFAULT_CATEGORY_SELECTOR_PRESENTATION,
          enabled: false,
          scale_mode: "fit_width",
        })
      })

      it("should validate scale_mode and reject invalid values", () => {
        const invalid = {
          scale_mode: "invalid_mode",
        } as any

        const result = (service as any).normalizePresentationConfig(invalid)

        expect(result.scale_mode).toBe(DEFAULT_CATEGORY_SELECTOR_PRESENTATION.scale_mode)
      })

      it("should accept all valid scale_modes", () => {
        const validScaleModes = [
          "fit_width",
          "fit_height",
          "cover",
          "shortest_side",
          "longest_side",
        ]

        for (const scaleMode of validScaleModes) {
          const result = (service as any).normalizePresentationConfig({
            scale_mode: scaleMode,
          })
          expect(result.scale_mode).toBe(scaleMode)
        }
      })

      it("should validate style and reject invalid values", () => {
        const invalid = {
          style: "invalid_style",
        } as any

        const result = (service as any).normalizePresentationConfig(invalid)

        expect(result.style).toBe(DEFAULT_CATEGORY_SELECTOR_PRESENTATION.style)
      })

      it("should accept all valid styles", () => {
        const validStyles = ["flips", "edge_to_edge", "square", "carousel", "grid"]

        for (const style of validStyles) {
          const result = (service as any).normalizePresentationConfig({
            style,
          })
          expect(result.style).toBe(style)
        }
      })

      it("should normalize max_rows using normalizeDimension", () => {
        const testCases = [
          { input: 5, expected: 5 },
          { input: "10", expected: 10 },
          { input: 0, expected: null },
          { input: null, expected: null },
        ]

        for (const testCase of testCases) {
          const result = (service as any).normalizePresentationConfig({
            max_rows: testCase.input,
          })
          expect(result.max_rows).toBe(testCase.expected)
        }
      })

      it("should normalize max_columns using normalizeDimension", () => {
        const testCases = [
          { input: 3, expected: 3 },
          { input: "8", expected: 8 },
          { input: 0, expected: null },
          { input: null, expected: null },
        ]

        for (const testCase of testCases) {
          const result = (service as any).normalizePresentationConfig({
            max_columns: testCase.input,
          })
          expect(result.max_columns).toBe(testCase.expected)
        }
      })

      it("should handle boolean randomize_visible_categories", () => {
        const trueResult = (service as any).normalizePresentationConfig({
          randomize_visible_categories: true,
        })
        expect(trueResult.randomize_visible_categories).toBe(true)

        const falseResult = (service as any).normalizePresentationConfig({
          randomize_visible_categories: false,
        })
        expect(falseResult.randomize_visible_categories).toBe(false)
      })

      it("should ignore non-boolean randomize_visible_categories", () => {
        const result = (service as any).normalizePresentationConfig({
          randomize_visible_categories: "true" as any,
        })
        expect(result.randomize_visible_categories).toBe(
          DEFAULT_CATEGORY_SELECTOR_PRESENTATION.randomize_visible_categories
        )
      })

      it("should handle all fields together", () => {
        const full: CategorySelectorPresentationConfig = {
          enabled: false,
          scale_mode: "longest_side",
          style: "carousel",
          max_rows: 2,
          max_columns: 6,
          randomize_visible_categories: true,
        }

        const result = (service as any).normalizePresentationConfig(full)

        expect(result).toEqual(full)
      })
    })

    describe("normalizeDimension", () => {
      it("should accept positive integers", () => {
        expect((service as any).normalizeDimension(5)).toBe(5)
        expect((service as any).normalizeDimension(100)).toBe(100)
        expect((service as any).normalizeDimension(1)).toBe(1)
      })

      it("should floor decimal numbers", () => {
        expect((service as any).normalizeDimension(5.7)).toBe(5)
        expect((service as any).normalizeDimension(10.2)).toBe(10)
        expect((service as any).normalizeDimension(3.9)).toBe(3)
      })

      it("should return null for zero", () => {
        expect((service as any).normalizeDimension(0)).toBeNull()
      })

      it("should return null for negative numbers", () => {
        expect((service as any).normalizeDimension(-5)).toBeNull()
        expect((service as any).normalizeDimension(-1)).toBeNull()
      })

      it("should parse valid numeric strings", () => {
        expect((service as any).normalizeDimension("10")).toBe(10)
        expect((service as any).normalizeDimension("5")).toBe(5)
        expect((service as any).normalizeDimension("100")).toBe(100)
      })

      it("should parse string with whitespace", () => {
        expect((service as any).normalizeDimension("  10  ")).toBe(10)
        expect((service as any).normalizeDimension("\t5\n")).toBe(5)
      })

      it("should return null for string zero", () => {
        expect((service as any).normalizeDimension("0")).toBeNull()
      })

      it("should return null for invalid string", () => {
        expect((service as any).normalizeDimension("abc")).toBeNull()
        expect((service as any).normalizeDimension("not-a-number")).toBeNull()
      })

      it("should parse leading digits from string (parseInt behavior)", () => {
        // parseInt stops at first non-digit, so "10px" -> 10
        expect((service as any).normalizeDimension("10px")).toBe(10)
        expect((service as any).normalizeDimension("5.5extra")).toBe(5)
      })

      it("should return null for empty string", () => {
        expect((service as any).normalizeDimension("")).toBeNull()
        expect((service as any).normalizeDimension("   ")).toBeNull()
      })

      it("should return null for null", () => {
        expect((service as any).normalizeDimension(null)).toBeNull()
      })

      it("should return null for undefined", () => {
        expect((service as any).normalizeDimension(undefined)).toBeNull()
      })

      it("should return null for non-numeric types", () => {
        expect((service as any).normalizeDimension({})).toBeNull()
        expect((service as any).normalizeDimension([])).toBeNull()
        expect((service as any).normalizeDimension(true)).toBeNull()
      })
    })
  })

  describe("Metadata Handling", () => {
    describe("ensureMetadataShape", () => {
      it("should create metadata object from null input", () => {
        const result = (service as any).ensureMetadataShape(null)

        expect(result).toHaveProperty("presentation")
        expect(result.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should create metadata object from undefined input", () => {
        const result = (service as any).ensureMetadataShape(undefined)

        expect(result).toHaveProperty("presentation")
        expect(result.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should preserve existing metadata fields", () => {
        const existing = {
          customField: "value",
          anotherField: 123,
        }

        const result = (service as any).ensureMetadataShape(existing)

        expect(result.customField).toBe("value")
        expect(result.anotherField).toBe(123)
        expect(result.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should extract and normalize existing presentation", () => {
        const existing = {
          presentation: {
            enabled: false,
            scale_mode: "fit_width",
          },
          otherField: "value",
        }

        const result = (service as any).ensureMetadataShape(existing)

        expect(result.otherField).toBe("value")
        expect(result.presentation).toMatchObject({
          enabled: false,
          scale_mode: "fit_width",
        })
      })

      it("should use presentationOverride when provided", () => {
        const existing = {
          presentation: {
            enabled: false,
            scale_mode: "fit_width",
          },
        }

        const override: Partial<CategorySelectorPresentationConfig> = {
          enabled: true,
          style: "carousel",
        }

        const result = (service as any).ensureMetadataShape(existing, override)

        expect(result.presentation).toMatchObject({
          enabled: true,
          style: "carousel",
        })
        // Should merge with defaults
        expect(result.presentation.scale_mode).toBe(
          DEFAULT_CATEGORY_SELECTOR_PRESENTATION.scale_mode
        )
      })

      it("should ignore non-object metadata", () => {
        const result1 = (service as any).ensureMetadataShape("string")
        const result2 = (service as any).ensureMetadataShape(123)
        const result3 = (service as any).ensureMetadataShape(true)

        expect(result1.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
        expect(result2.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
        expect(result3.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should ignore array metadata", () => {
        const result = (service as any).ensureMetadataShape([1, 2, 3])

        expect(result.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      })

      it("should create copy of metadata (not reference)", () => {
        const existing = {
          field: "value",
        }

        const result = (service as any).ensureMetadataShape(existing)

        result.field = "modified"

        expect(existing.field).toBe("value")
      })
    })

    describe("extractPresentationDraft", () => {
      it("should extract valid presentation object", () => {
        const metadata = {
          presentation: {
            enabled: false,
            scale_mode: "fit_height",
          },
        }

        const result = (service as any).extractPresentationDraft(metadata)

        expect(result).toEqual({
          enabled: false,
          scale_mode: "fit_height",
        })
      })

      it("should return undefined when presentation is missing", () => {
        const metadata = {
          otherField: "value",
        }

        const result = (service as any).extractPresentationDraft(metadata)

        expect(result).toBeUndefined()
      })

      it("should return undefined when presentation is null", () => {
        const metadata = {
          presentation: null,
        }

        const result = (service as any).extractPresentationDraft(metadata)

        expect(result).toBeUndefined()
      })

      it("should return undefined when presentation is not an object", () => {
        const metadata = {
          presentation: "string",
        }

        const result = (service as any).extractPresentationDraft(metadata)

        expect(result).toBeUndefined()
      })

      it("should return undefined when presentation is an array", () => {
        const metadata = {
          presentation: [1, 2, 3],
        }

        const result = (service as any).extractPresentationDraft(metadata)

        expect(result).toBeUndefined()
      })
    })

    describe("metadata preservation during updates", () => {
      it("should preserve custom metadata fields when upserting", async () => {
        const input: CategorySelectorConfigUpsertDTO = {
          category_id: "cat_meta",
          mode: "random_product",
          metadata: {
            customField: "preserved",
            anotherField: 456,
          },
        }

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValue([])

        const mockCreated = buildMockEntity({
          category_id: "cat_meta",
          metadata: {
            customField: "preserved",
            anotherField: 456,
            presentation: DEFAULT_CATEGORY_SELECTOR_PRESENTATION,
          },
        })
        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(mockCreated)

        const result = await service.upsertCategoryConfig(input)

        expect((result.metadata as any).customField).toBe("preserved")
        expect((result.metadata as any).anotherField).toBe(456)
      })

      it("should preserve metadata when updating presentation", async () => {
        const existingConfig = buildMockEntity({
          metadata: {
            customField: "important",
            presentation: DEFAULT_CATEGORY_SELECTOR_PRESENTATION,
          },
        })

        jest
          .spyOn(service, "listCategorySelectorByProductConfigs")
          .mockResolvedValueOnce([]) // For global upsert
          .mockResolvedValueOnce([existingConfig]) // For cascade

        jest
          .spyOn(service, "createCategorySelectorByProductConfigs")
          .mockResolvedValue(buildMockEntity())

        const updateSpy = jest
          .spyOn(service, "updateCategorySelectorByProductConfigs")
          .mockResolvedValue(buildMockEntity())

        await service.updateGlobalPresentation({ enabled: false })

        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              customField: "important",
            }),
          })
        )
      })
    })
  })

  describe("toDTO conversion", () => {
    it("should convert entity to DTO with all fields", () => {
      const entity = buildMockEntity({
        id: "config_dto",
        category_id: "cat_dto",
        mode: "product_image",
        custom_image_url: "https://example.com/image.jpg",
        selected_product_id: "prod_123",
        selected_product_image_id: "img_456",
        random_product_ids: ["prod_1", "prod_2"],
        metadata: {
          presentation: DEFAULT_CATEGORY_SELECTOR_PRESENTATION,
          customField: "value",
        },
      })

      const result = (service as any).toDTO(entity)

      expect(result).toMatchObject({
        id: "config_dto",
        category_id: "cat_dto",
        mode: "product_image",
        custom_image_url: "https://example.com/image.jpg",
        selected_product_id: "prod_123",
        selected_product_image_id: "img_456",
        random_product_ids: ["prod_1", "prod_2"],
      })
      expect(result.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
      expect(result.metadata).toHaveProperty("customField", "value")
    })

    it("should handle null random_product_ids", () => {
      const entity = buildMockEntity({
        random_product_ids: null,
      })

      const result = (service as any).toDTO(entity)

      expect(result.random_product_ids).toBeNull()
    })

    it("should convert random_product_ids to array if needed", () => {
      const entity = buildMockEntity({
        random_product_ids: ["prod_1", "prod_2"],
      })

      const result = (service as any).toDTO(entity)

      expect(Array.isArray(result.random_product_ids)).toBe(true)
      expect(result.random_product_ids).toEqual(["prod_1", "prod_2"])
    })

    it("should ensure metadata has presentation field", () => {
      const entity = buildMockEntity({
        metadata: {},
      })

      const result = (service as any).toDTO(entity)

      expect(result.presentation).toEqual(DEFAULT_CATEGORY_SELECTOR_PRESENTATION)
    })
  })
})
