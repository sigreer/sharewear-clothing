import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let testCategoryId: string
    let testProductId: string
    let testProductImageId: string

    beforeAll(async () => {
      // Create test data
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      // Create test category
      const category = await productModuleService.createProductCategories({
        name: "Test Category Selector Category",
        handle: "test-category-selector-category",
        description: "Test category for category selector API tests",
        is_active: true,
      })
      testCategoryId = category.id

      // Create test product with images
      const product = await productModuleService.createProducts({
        title: "Test Category Selector Product",
        handle: "test-category-selector-product",
        description: "Test product for category selector API tests",
        status: "published",
        images: [
          {
            url: "https://example.com/test-image.jpg",
            metadata: { alt: "Test image" },
          },
        ],
      })
      testProductId = product.id
      testProductImageId = product.images?.[0]?.id || ""
    })

    afterAll(async () => {
      // Clean up test data
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      if (testProductId) {
        await productModuleService.softDeleteProducts([testProductId])
      }

      if (testCategoryId) {
        await productModuleService.softDeleteProductCategories([testCategoryId])
      }
    })

    describe("GET /admin/category-selector-by-product", () => {
      it("should list all base categories with selector configurations", async () => {
        const response = await api.get("/admin/category-selector-by-product")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("categories")
        expect(Array.isArray(response.data.categories)).toBe(true)
        expect(response.data).toHaveProperty("total")
        expect(response.data).toHaveProperty("availableModes")
        expect(response.data).toHaveProperty("presentation")
      })

      it("should return only base categories (no parent)", async () => {
        const response = await api.get("/admin/category-selector-by-product")

        expect(response.status).toBe(200)
        response.data.categories.forEach((category: any) => {
          expect(category.parent_category_id).toBeNull()
        })
      })

      it("should return available representation modes", async () => {
        const response = await api.get("/admin/category-selector-by-product")

        expect(response.status).toBe(200)
        expect(response.data.availableModes).toContain("custom_image")
        expect(response.data.availableModes).toContain("product_image")
        expect(response.data.availableModes).toContain("random_product")
      })

      it("should return categories with config structure", async () => {
        const response = await api.get("/admin/category-selector-by-product")

        expect(response.status).toBe(200)
        if (response.data.categories.length > 0) {
          const category = response.data.categories[0]
          expect(category).toHaveProperty("id")
          expect(category).toHaveProperty("name")
          expect(category).toHaveProperty("handle")
          expect(category).toHaveProperty("config")
          expect(category.config).toHaveProperty("mode")
          expect(category.config).toHaveProperty("presentation")
        }
      })

      it("should include global presentation settings", async () => {
        const response = await api.get("/admin/category-selector-by-product")

        expect(response.status).toBe(200)
        expect(response.data.presentation).toHaveProperty("aspectRatio")
        expect(response.data.presentation).toHaveProperty("shape")
        expect(response.data.presentation).toHaveProperty("objectFit")
      })
    })

    describe("GET /admin/category-selector-by-product/[category_id]", () => {
      it("should retrieve category selector configuration", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryId}`
        )

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("category_id")
        expect(response.data).toHaveProperty("config")
        expect(response.data).toHaveProperty("has_configuration")
        expect(response.data.category_id).toBe(testCategoryId)
      })

      it("should return 400 for missing category ID", async () => {
        const response = await api.get("/admin/category-selector-by-product/")

        expect(response.status).toBe(404) // Route not found
      })

      it("should return default config for category without configuration", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryId}`
        )

        expect(response.status).toBe(200)
        if (!response.data.has_configuration) {
          expect(response.data.config.mode).toBe("random_product")
        }
      })

      it("should include resolved product details", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryId}`
        )

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("resolved_product")
        expect(response.data).toHaveProperty("resolved_image")
        expect(response.data).toHaveProperty("resolved_pool")
      })
    })

    describe("PUT /admin/category-selector-by-product/[category_id]", () => {
      afterEach(async () => {
        // Clean up config after each test
        await api.delete(`/admin/category-selector-by-product/${testCategoryId}`).catch(() => {})
      })

      it("should create category selector configuration with custom_image mode", async () => {
        const payload = {
          mode: "custom_image",
          custom_image_url: "https://example.com/custom-category-image.jpg",
        }

        const response = await api.put(
          `/admin/category-selector-by-product/${testCategoryId}`,
          payload
        )

        expect(response.status).toBe(200)
        expect(response.data.config.mode).toBe("custom_image")
        expect(response.data.config.custom_image_url).toBe(payload.custom_image_url)
      })

      it("should create configuration with product_image mode", async () => {
        const payload = {
          mode: "product_image",
          selected_product_id: testProductId,
          selected_product_image_id: testProductImageId,
        }

        const response = await api.put(
          `/admin/category-selector-by-product/${testCategoryId}`,
          payload
        )

        expect(response.status).toBe(200)
        expect(response.data.config.mode).toBe("product_image")
        expect(response.data.config.selected_product_id).toBe(testProductId)
        expect(response.data.config.selected_product_image_id).toBe(testProductImageId)
      })

      it("should create configuration with random_product mode", async () => {
        const payload = {
          mode: "random_product",
          random_product_ids: [testProductId],
        }

        const response = await api.put(
          `/admin/category-selector-by-product/${testCategoryId}`,
          payload
        )

        expect(response.status).toBe(200)
        expect(response.data.config.mode).toBe("random_product")
        expect(response.data.config.random_product_ids).toContain(testProductId)
      })

      it("should return 400 when mode is missing", async () => {
        const payload = {
          custom_image_url: "https://example.com/image.jpg",
        }

        const response = await api.put(
          `/admin/category-selector-by-product/${testCategoryId}`,
          payload
        )

        expect(response.status).toBe(400)
        expect(response.data.message).toContain("mode is required")
      })

      it("should update existing configuration", async () => {
        // First create
        await api.put(`/admin/category-selector-by-product/${testCategoryId}`, {
          mode: "custom_image",
          custom_image_url: "https://example.com/image1.jpg",
        })

        // Then update
        const updatedPayload = {
          mode: "custom_image",
          custom_image_url: "https://example.com/image2.jpg",
        }

        const response = await api.put(
          `/admin/category-selector-by-product/${testCategoryId}`,
          updatedPayload
        )

        expect(response.status).toBe(200)
        expect(response.data.config.custom_image_url).toBe(updatedPayload.custom_image_url)
      })

      it("should support custom presentation settings", async () => {
        const payload = {
          mode: "custom_image",
          custom_image_url: "https://example.com/image.jpg",
          presentation: {
            aspectRatio: "1:1",
            shape: "circle",
            objectFit: "cover",
          },
        }

        const response = await api.put(
          `/admin/category-selector-by-product/${testCategoryId}`,
          payload
        )

        expect(response.status).toBe(200)
        expect(response.data.config.presentation.aspectRatio).toBe("1:1")
        expect(response.data.config.presentation.shape).toBe("circle")
      })

      it("should persist configuration", async () => {
        const payload = {
          mode: "custom_image",
          custom_image_url: "https://example.com/persistent.jpg",
        }

        await api.put(`/admin/category-selector-by-product/${testCategoryId}`, payload)

        // Retrieve and verify
        const getResponse = await api.get(
          `/admin/category-selector-by-product/${testCategoryId}`
        )
        expect(getResponse.data.config.mode).toBe("custom_image")
        expect(getResponse.data.config.custom_image_url).toBe(payload.custom_image_url)
        expect(getResponse.data.has_configuration).toBe(true)
      })
    })

    describe("DELETE /admin/category-selector-by-product/[category_id]", () => {
      beforeEach(async () => {
        // Create config before each delete test
        await api.put(`/admin/category-selector-by-product/${testCategoryId}`, {
          mode: "custom_image",
          custom_image_url: "https://example.com/delete-test.jpg",
        })
      })

      it("should delete category selector configuration", async () => {
        const response = await api.delete(
          `/admin/category-selector-by-product/${testCategoryId}`
        )

        expect(response.status).toBe(204)
      })

      it("should remove config from database", async () => {
        await api.delete(`/admin/category-selector-by-product/${testCategoryId}`)

        // Verify it's deleted
        const getResponse = await api.get(
          `/admin/category-selector-by-product/${testCategoryId}`
        )
        expect(getResponse.data.has_configuration).toBe(false)
      })
    })

    describe("GET /admin/category-selector-by-product/settings", () => {
      it("should retrieve global presentation settings", async () => {
        const response = await api.get("/admin/category-selector-by-product/settings")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("presentation")
        expect(response.data.presentation).toHaveProperty("aspectRatio")
        expect(response.data.presentation).toHaveProperty("shape")
        expect(response.data.presentation).toHaveProperty("objectFit")
      })
    })

    describe("PUT /admin/category-selector-by-product/settings", () => {
      let originalSettings: any

      beforeAll(async () => {
        // Save original settings
        const response = await api.get("/admin/category-selector-by-product/settings")
        originalSettings = response.data.presentation
      })

      afterAll(async () => {
        // Restore original settings
        if (originalSettings) {
          await api.put("/admin/category-selector-by-product/settings", {
            presentation: originalSettings,
          })
        }
      })

      it("should update global presentation settings", async () => {
        const payload = {
          presentation: {
            aspectRatio: "1:1",
            shape: "circle",
            objectFit: "cover",
          },
        }

        const response = await api.put(
          "/admin/category-selector-by-product/settings",
          payload
        )

        expect(response.status).toBe(200)
        expect(response.data.presentation.aspectRatio).toBe("1:1")
        expect(response.data.presentation.shape).toBe("circle")
        expect(response.data.presentation.objectFit).toBe("cover")
      })

      it("should return 400 for invalid presentation format", async () => {
        const payload = {
          presentation: "invalid-string",
        }

        const response = await api.put(
          "/admin/category-selector-by-product/settings",
          payload
        )

        expect(response.status).toBe(400)
        expect(response.data.message).toContain("must be provided as an object")
      })

      it("should persist presentation settings", async () => {
        const payload = {
          presentation: {
            aspectRatio: "4:3",
            shape: "square",
          },
        }

        await api.put("/admin/category-selector-by-product/settings", payload)

        // Retrieve and verify
        const getResponse = await api.get("/admin/category-selector-by-product/settings")
        expect(getResponse.data.presentation.aspectRatio).toBe("4:3")
        expect(getResponse.data.presentation.shape).toBe("square")
      })
    })

    describe("GET /admin/category-selector-by-product/[category_id]/products", () => {
      let testCategoryWithProducts: string

      beforeAll(async () => {
        const container = getContainer()
        const productModuleService = container.resolve(Modules.PRODUCT)

        // Create category with products
        const category = await productModuleService.createProductCategories({
          name: "Test Category With Products",
          handle: "test-category-with-products",
        })
        testCategoryWithProducts = category.id

        // Create products in category
        await productModuleService.createProducts({
          title: "Test Product 1",
          handle: "test-product-1",
          categories: [{ id: testCategoryWithProducts }],
        })
      })

      afterAll(async () => {
        const container = getContainer()
        const productModuleService = container.resolve(Modules.PRODUCT)

        if (testCategoryWithProducts) {
          await productModuleService.softDeleteProductCategories([testCategoryWithProducts])
        }
      })

      it("should list products for a category", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryWithProducts}/products`
        )

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("products")
        expect(response.data).toHaveProperty("count")
        expect(response.data).toHaveProperty("limit")
        expect(response.data).toHaveProperty("offset")
        expect(response.data.category_id).toBe(testCategoryWithProducts)
      })

      it("should return 400 for missing category ID", async () => {
        const response = await api.get("/admin/category-selector-by-product//products")

        expect(response.status).toBe(404)
      })

      it("should support search query parameter", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryWithProducts}/products?q=test`
        )

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("products")
      })

      it("should support limit parameter", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryWithProducts}/products?limit=10`
        )

        expect(response.status).toBe(200)
        expect(response.data.limit).toBe(10)
      })

      it("should support offset parameter", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryWithProducts}/products?offset=5`
        )

        expect(response.status).toBe(200)
        expect(response.data.offset).toBe(5)
      })

      it("should return correct product structure", async () => {
        const response = await api.get(
          `/admin/category-selector-by-product/${testCategoryWithProducts}/products`
        )

        if (response.data.products.length > 0) {
          const product = response.data.products[0]
          expect(product).toHaveProperty("id")
          expect(product).toHaveProperty("title")
          expect(product).toHaveProperty("handle")
          expect(product).toHaveProperty("images")
          expect(Array.isArray(product.images)).toBe(true)
        }
      })
    })

    describe("GET /store/category-selector-by-product", () => {
      it("should retrieve storefront category selector data", async () => {
        const response = await api.get("/store/category-selector-by-product")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("categories")
        expect(response.data).toHaveProperty("presentation")
        expect(response.data).toHaveProperty("generated_at")
        expect(Array.isArray(response.data.categories)).toBe(true)
      })

      it("should return categories with representation data", async () => {
        const response = await api.get("/store/category-selector-by-product")

        expect(response.status).toBe(200)
        if (response.data.categories.length > 0) {
          const category = response.data.categories[0]
          expect(category).toHaveProperty("id")
          expect(category).toHaveProperty("name")
          expect(category).toHaveProperty("handle")
          expect(category).toHaveProperty("mode")
          expect(category).toHaveProperty("representation")
          expect(category).toHaveProperty("has_configuration")
          expect(category).toHaveProperty("issues")
        }
      })

      it("should include presentation settings", async () => {
        const response = await api.get("/store/category-selector-by-product")

        expect(response.status).toBe(200)
        expect(response.data.presentation).toHaveProperty("aspectRatio")
        expect(response.data.presentation).toHaveProperty("shape")
        expect(response.data.presentation).toHaveProperty("objectFit")
      })

      it("should validate representation types", async () => {
        const response = await api.get("/store/category-selector-by-product")

        expect(response.status).toBe(200)
        response.data.categories.forEach((category: any) => {
          expect(["custom_image", "product_image", "random_pool"]).toContain(
            category.representation.type
          )
        })
      })

      it("should include generated_at timestamp", async () => {
        const response = await api.get("/store/category-selector-by-product")

        expect(response.status).toBe(200)
        expect(response.data.generated_at).toBeDefined()
        expect(new Date(response.data.generated_at).getTime()).not.toBeNaN()
      })
    })
  },
})
