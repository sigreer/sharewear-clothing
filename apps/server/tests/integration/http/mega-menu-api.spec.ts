import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let testCategoryId: string
    let testProductId: string

    beforeAll(async () => {
      // Create a test category and product for use in tests
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      // Create test category
      const category = await productModuleService.createProductCategories({
        name: "Test Mega Menu Category",
        handle: "test-mega-menu-category",
        description: "Test category for mega menu API tests",
        is_active: true,
        is_internal: false,
      })
      testCategoryId = category.id

      // Create test product
      const product = await productModuleService.createProducts({
        title: "Test Mega Menu Product",
        handle: "test-mega-menu-product",
        description: "Test product for mega menu API tests",
        status: "published",
      })
      testProductId = product.id
    })

    afterAll(async () => {
      // Clean up test data
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      // Delete test product
      if (testProductId) {
        await productModuleService.softDeleteProducts([testProductId])
      }

      // Delete test category
      if (testCategoryId) {
        await productModuleService.softDeleteProductCategories([testCategoryId])
      }
    })

    describe("GET /admin/mega-menu/categories", () => {
      it("should list categories with mega menu configuration", async () => {
        const response = await api.get("/admin/mega-menu/categories")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("categories")
        expect(Array.isArray(response.data.categories)).toBe(true)
        expect(response.data).toHaveProperty("total")
        expect(response.data).toHaveProperty("availableLayouts")
        expect(response.data).toHaveProperty("defaults")
        expect(Array.isArray(response.data.availableLayouts)).toBe(true)
      })

      it("should support query parameter for search", async () => {
        const response = await api.get("/admin/mega-menu/categories?q=test")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("categories")
      })

      it("should support limit parameter", async () => {
        const response = await api.get("/admin/mega-menu/categories?limit=5")

        expect(response.status).toBe(200)
        expect(response.data.categories.length).toBeLessThanOrEqual(5)
      })

      it("should return correct category structure", async () => {
        const response = await api.get("/admin/mega-menu/categories")

        if (response.data.categories.length > 0) {
          const category = response.data.categories[0]
          expect(category).toHaveProperty("id")
          expect(category).toHaveProperty("name")
          expect(category).toHaveProperty("handle")
          expect(category).toHaveProperty("config")
        }
      })
    })

    describe("GET /admin/mega-menu/global", () => {
      it("should retrieve global mega menu configuration", async () => {
        const response = await api.get("/admin/mega-menu/global")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("config")
        expect(response.data).toHaveProperty("defaults")
      })

      it("should return correct global config structure", async () => {
        const response = await api.get("/admin/mega-menu/global")

        expect(response.status).toBe(200)
        expect(response.data.defaults).toHaveProperty("layout")
        expect(response.data.defaults).toHaveProperty("teaserAlign")
        expect(response.data.defaults).toHaveProperty("teaserPosition")
      })
    })

    describe("PUT /admin/mega-menu/global", () => {
      let originalConfig: any

      beforeAll(async () => {
        // Save original config
        const response = await api.get("/admin/mega-menu/global")
        originalConfig = response.data.config
      })

      afterAll(async () => {
        // Restore original config
        if (originalConfig) {
          await api.put("/admin/mega-menu/global", originalConfig)
        } else {
          // Delete if there was no original config
          await api.delete("/admin/mega-menu/global")
        }
      })

      it("should create global mega menu configuration", async () => {
        const payload = {
          layout: "rich-columns",
          columns: [
            {
              title: "Featured",
              links: [
                { label: "New Arrivals", href: "/new" },
                { label: "Best Sellers", href: "/best-sellers" },
              ],
            },
          ],
        }

        const response = await api.put("/admin/mega-menu/global", payload)

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("config")
        expect(response.data.config.layout).toBe("rich-columns")
        expect(response.data.config.columns).toEqual(payload.columns)
      })

      it("should update existing global configuration", async () => {
        // First create a config
        await api.put("/admin/mega-menu/global", {
          layout: "simple-dropdown",
        })

        // Then update it
        const updatedPayload = {
          layout: "rich-columns",
          columns: [
            {
              title: "Updated Column",
              links: [{ label: "Link 1", href: "/link1" }],
            },
          ],
        }

        const response = await api.put("/admin/mega-menu/global", updatedPayload)

        expect(response.status).toBe(200)
        expect(response.data.config.layout).toBe("rich-columns")
      })

      it("should persist global configuration", async () => {
        const payload = {
          layout: "rich-columns",
          teaserAlign: "right",
        }

        await api.put("/admin/mega-menu/global", payload)

        // Retrieve and verify
        const getResponse = await api.get("/admin/mega-menu/global")
        expect(getResponse.data.config.layout).toBe("rich-columns")
        expect(getResponse.data.config.teaserAlign).toBe("right")
      })
    })

    describe("DELETE /admin/mega-menu/global", () => {
      beforeEach(async () => {
        // Create a config before each delete test
        await api.put("/admin/mega-menu/global", {
          layout: "simple-dropdown",
        })
      })

      it("should delete global mega menu configuration", async () => {
        const response = await api.delete("/admin/mega-menu/global")

        expect(response.status).toBe(204)
      })

      it("should remove config from database", async () => {
        await api.delete("/admin/mega-menu/global")

        // Verify it's deleted
        const getResponse = await api.get("/admin/mega-menu/global")
        expect(getResponse.data.config).toBeNull()
      })
    })

    describe("GET /admin/mega-menu/[category_id]", () => {
      it("should retrieve category mega menu configuration", async () => {
        const response = await api.get(`/admin/mega-menu/${testCategoryId}`)

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("categoryId")
        expect(response.data).toHaveProperty("config")
        expect(response.data).toHaveProperty("inherited")
        expect(response.data).toHaveProperty("defaults")
        expect(response.data).toHaveProperty("availableMenuLayouts")
        expect(response.data.categoryId).toBe(testCategoryId)
      })

      it("should return 400 for missing category ID", async () => {
        const response = await api.get("/admin/mega-menu/")

        expect(response.status).toBe(404) // Route not found
      })

      it("should show inherited config when category has no specific config", async () => {
        // Create global config
        await api.put("/admin/mega-menu/global", {
          layout: "rich-columns",
        })

        const response = await api.get(`/admin/mega-menu/${testCategoryId}`)

        expect(response.status).toBe(200)
        if (response.data.config === null) {
          expect(response.data.inherited).not.toBeNull()
        }
      })

      it("should return available menu layouts", async () => {
        const response = await api.get(`/admin/mega-menu/${testCategoryId}`)

        expect(response.status).toBe(200)
        expect(response.data.availableMenuLayouts).toContain("no-menu")
        expect(response.data.availableMenuLayouts).toContain("simple-dropdown")
        expect(response.data.availableMenuLayouts).toContain("rich-columns")
      })
    })

    describe("PUT /admin/mega-menu/[category_id]", () => {
      afterEach(async () => {
        // Clean up category config after each test
        await api.delete(`/admin/mega-menu/${testCategoryId}`).catch(() => {})
      })

      it("should create category mega menu configuration", async () => {
        const payload = {
          layout: "rich-columns",
          columns: [
            {
              title: "Category Column",
              links: [{ label: "Link 1", href: "/link1" }],
            },
          ],
        }

        const response = await api.put(`/admin/mega-menu/${testCategoryId}`, payload)

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("config")
        expect(response.data.config.layout).toBe("rich-columns")
        expect(response.data.categoryId).toBe(testCategoryId)
      })

      it("should update existing category configuration", async () => {
        // First create
        await api.put(`/admin/mega-menu/${testCategoryId}`, {
          layout: "simple-dropdown",
        })

        // Then update
        const updatedPayload = {
          layout: "rich-columns",
        }

        const response = await api.put(`/admin/mega-menu/${testCategoryId}`, updatedPayload)

        expect(response.status).toBe(200)
        expect(response.data.config.layout).toBe("rich-columns")
      })

      it("should persist category configuration", async () => {
        const payload = {
          layout: "no-menu",
        }

        await api.put(`/admin/mega-menu/${testCategoryId}`, payload)

        // Retrieve and verify
        const getResponse = await api.get(`/admin/mega-menu/${testCategoryId}`)
        expect(getResponse.data.config.layout).toBe("no-menu")
      })

      it("should support thumbnail configuration", async () => {
        const payload = {
          layout: "rich-columns",
          selectedThumbnailProductId: testProductId,
        }

        const response = await api.put(`/admin/mega-menu/${testCategoryId}`, payload)

        expect(response.status).toBe(200)
        expect(response.data.config.selectedThumbnailProductId).toBe(testProductId)
      })
    })

    describe("DELETE /admin/mega-menu/[category_id]", () => {
      beforeEach(async () => {
        // Create config before each delete test
        await api.put(`/admin/mega-menu/${testCategoryId}`, {
          layout: "simple-dropdown",
        })
      })

      it("should delete category mega menu configuration", async () => {
        const response = await api.delete(`/admin/mega-menu/${testCategoryId}`)

        expect(response.status).toBe(204)
      })

      it("should remove config from database", async () => {
        await api.delete(`/admin/mega-menu/${testCategoryId}`)

        // Verify it's deleted
        const getResponse = await api.get(`/admin/mega-menu/${testCategoryId}`)
        expect(getResponse.data.config).toBeNull()
      })
    })

    describe("GET /admin/mega-menu/[category_id]/products", () => {
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
          title: "Product 1",
          handle: "product-1",
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
          `/admin/mega-menu/${testCategoryWithProducts}/products`
        )

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("products")
        expect(response.data).toHaveProperty("count")
        expect(response.data).toHaveProperty("limit")
        expect(response.data).toHaveProperty("offset")
        expect(response.data.category_id).toBe(testCategoryWithProducts)
      })

      it("should return 400 for missing category ID", async () => {
        const response = await api.get("/admin/mega-menu//products")

        expect(response.status).toBe(404)
      })

      it("should support search query parameter", async () => {
        const response = await api.get(
          `/admin/mega-menu/${testCategoryWithProducts}/products?q=product`
        )

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("products")
      })

      it("should support limit parameter", async () => {
        const response = await api.get(
          `/admin/mega-menu/${testCategoryWithProducts}/products?limit=5`
        )

        expect(response.status).toBe(200)
        expect(response.data.limit).toBe(5)
      })

      it("should support offset parameter", async () => {
        const response = await api.get(
          `/admin/mega-menu/${testCategoryWithProducts}/products?offset=10`
        )

        expect(response.status).toBe(200)
        expect(response.data.offset).toBe(10)
      })

      it("should return correct product structure", async () => {
        const response = await api.get(
          `/admin/mega-menu/${testCategoryWithProducts}/products`
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

    describe("GET /store/navigation", () => {
      it("should retrieve storefront navigation", async () => {
        const response = await api.get("/store/navigation")

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("items")
        expect(Array.isArray(response.data.items)).toBe(true)
      })

      it("should handle errors gracefully", async () => {
        const response = await api.get("/store/navigation")

        // Should always return 200 with items array, even if empty
        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("items")
      })

      it("should return navigation items with correct structure", async () => {
        const response = await api.get("/store/navigation")

        if (response.data.items.length > 0) {
          const item = response.data.items[0]
          expect(item).toHaveProperty("id")
          expect(item).toHaveProperty("name")
          expect(item).toHaveProperty("handle")
        }
      })
    })
  },
})
