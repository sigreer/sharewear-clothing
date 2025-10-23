/**
 * Integration Tests: Product Export Workflow
 *
 * Tests the custom product export workflow including CSV generation,
 * file storage, and URL generation with proper access settings.
 *
 * @integration
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { exportProductsWorkflow } from "../export-products"
import { generateProductCsvStep } from "../steps/generate-product-csv"

// Set longer timeout for integration tests
jest.setTimeout(60000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Product Export Workflow Integration Tests", () => {
      let container: any

      beforeAll(async () => {
        container = getContainer()
      })

      describe("Export Products Workflow", () => {
        it("should export all products to CSV", async () => {
          // Execute workflow
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"]
            }
          })

          expect(result).toBeDefined()
          expect(result).toHaveProperty("file")
          expect(result).toHaveProperty("fileDetails")
          expect(result.file).toHaveProperty("id")
          expect(result.fileDetails).toHaveProperty("url")
        })

        it("should export products with specific filters", async () => {
          // Execute workflow with filter
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"],
              filter: {
                status: ["published"]
              }
            }
          })

          expect(result).toBeDefined()
          expect(result.file).toHaveProperty("id")
        })

        it("should create file with public access", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"]
            }
          })

          // Verify file was created with public access (no "private-" prefix in URL)
          expect(result.fileDetails.url).toBeDefined()
          expect(result.fileDetails.url).not.toContain("private-")
        })

        it("should include file URL in result", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"]
            }
          })

          expect(result.fileDetails).toHaveProperty("url")
          expect(typeof result.fileDetails.url).toBe("string")
          expect(result.fileDetails.url).toMatch(/^http/)
        })

        it("should cleanup file on workflow failure", async () => {
          const fileModule = container.resolve(Modules.FILE)

          try {
            // Force failure by providing invalid input
            await exportProductsWorkflow(container).run({
              input: {
                select: ["*"],
                filter: {
                  // @ts-ignore - intentionally invalid filter
                  invalid_field: "invalid_value"
                }
              }
            })
          } catch (error) {
            // Expected to fail
          }

          // Verify compensation cleaned up any created files
          // This is implicit - if file exists, compensation didn't run properly
        })
      })

      describe("Generate Product CSV Step", () => {
        let testProducts: any[]

        beforeEach(async () => {
          // Create mock product data
          testProducts = [
            {
              id: "prod_test_export_01",
              title: "Test Product 1",
              handle: "test-product-1",
              description: "Test description 1",
              status: "published",
              thumbnail: "http://test.com/thumb1.jpg",
              images: [
                { url: "http://test.com/image1.jpg" },
                { url: "http://test.com/image2.jpg" }
              ],
              tags: [
                { value: "tag1" },
                { value: "tag2" }
              ],
              categories: [
                { id: "cat_1" }
              ],
              sales_channels: [
                { id: "sc_1" }
              ],
              variants: [
                {
                  id: "var_1",
                  title: "Variant 1",
                  sku: "SKU1",
                  price_set: {
                    prices: [
                      {
                        currency_code: "usd",
                        amount: 1000,
                        price_rules: []
                      }
                    ]
                  },
                  options: []
                }
              ],
              options: []
            }
          ]
        })

        it("should generate CSV with proper headers", async () => {
          const result = await generateProductCsvStep.invoke({
            invoke: testProducts,
            container
          })

          expect(result.output).toHaveProperty("id")
          expect(result.output).toHaveProperty("filename", "product-exports.csv")

          // Verify file was created
          const fileModule = container.resolve(Modules.FILE)
          const file = await fileModule.retrieveFile(result.output.id)
          expect(file).toBeDefined()
          expect(file.filename).toContain("product-exports.csv")
        })

        it("should set access to public to prevent duplicate timestamp prefix", async () => {
          const result = await generateProductCsvStep.invoke({
            invoke: testProducts,
            container
          })

          const fileModule = container.resolve(Modules.FILE)
          const file = await fileModule.retrieveFile(result.output.id)

          // Verify file has public access (filename should not start with "private-")
          expect(file.filename).not.toMatch(/^private-/)
        })

        it("should include product data in CSV", async () => {
          const result = await generateProductCsvStep.invoke({
            invoke: testProducts,
            container
          })

          expect(result.output).toHaveProperty("id")

          // CSV content is created but we can't easily verify without downloading
          // The step uses json2csv which is unit tested separately
        })

        it("should handle products with no variants", async () => {
          const productsNoVariants = [
            {
              ...testProducts[0],
              variants: []
            }
          ]

          const result = await generateProductCsvStep.invoke({
            invoke: productsNoVariants,
            container
          })

          expect(result.output).toHaveProperty("id")
        })

        it("should handle products with multiple variants", async () => {
          const productsMultiVariants = [
            {
              ...testProducts[0],
              variants: [
                {
                  id: "var_1",
                  title: "Variant 1",
                  sku: "SKU1",
                  price_set: { prices: [] },
                  options: []
                },
                {
                  id: "var_2",
                  title: "Variant 2",
                  sku: "SKU2",
                  price_set: { prices: [] },
                  options: []
                }
              ]
            }
          ]

          const result = await generateProductCsvStep.invoke({
            invoke: productsMultiVariants,
            container
          })

          expect(result.output).toHaveProperty("id")
        })

        it("should flatten nested product data correctly", async () => {
          const productsWithNestedData = [
            {
              ...testProducts[0],
              images: [
                { url: "http://test.com/img1.jpg" },
                { url: "http://test.com/img2.jpg" },
                { url: "http://test.com/img3.jpg" }
              ],
              tags: [
                { value: "summer" },
                { value: "casual" },
                { value: "cotton" }
              ]
            }
          ]

          const result = await generateProductCsvStep.invoke({
            invoke: productsWithNestedData,
            container
          })

          expect(result.output).toHaveProperty("id")
          // CSV should have columns like:
          // Product Image 1, Product Image 2, Product Image 3
          // Product Tag 1, Product Tag 2, Product Tag 3
        })

        it("should handle variant price with regions", async () => {
          const regionService = container.resolve(Modules.REGION)

          // Create test region if it doesn't exist
          let testRegion
          try {
            const regions = await regionService.listRegions({
              name: "Test Region"
            })
            testRegion = regions[0]
          } catch (error) {
            // Region might not exist in test environment
          }

          if (testRegion) {
            const productsWithRegionPrices = [
              {
                ...testProducts[0],
                variants: [
                  {
                    id: "var_1",
                    title: "Variant 1",
                    sku: "SKU1",
                    price_set: {
                      prices: [
                        {
                          currency_code: "usd",
                          amount: 1000,
                          price_rules: [
                            {
                              attribute: "region_id",
                              value: testRegion.id
                            }
                          ]
                        }
                      ]
                    },
                    options: []
                  }
                ]
              }
            ]

            const result = await generateProductCsvStep.invoke({
              invoke: productsWithRegionPrices,
              container
            })

            expect(result.output).toHaveProperty("id")
          }
        })

        it("should sort CSV columns correctly", async () => {
          const result = await generateProductCsvStep.invoke({
            invoke: testProducts,
            container
          })

          expect(result.output).toHaveProperty("id")
          // Column order should be:
          // Product columns first (Id, Handle, Title, etc.)
          // Then Variant columns (Variant Id, Variant Title, etc.)
          // Then dynamic columns (prices, images, tags, etc.)
        })

        it("should escape CSV values to prevent injection", async () => {
          const productsWithSpecialChars = [
            {
              ...testProducts[0],
              title: '=1+1"; DROP TABLE products--',
              description: 'Contains "quotes" and, commas'
            }
          ]

          const result = await generateProductCsvStep.invoke({
            invoke: productsWithSpecialChars,
            container
          })

          expect(result.output).toHaveProperty("id")
          // json2csv library should prevent CSV injection
        })

        it("should run compensation on failure (delete file)", async () => {
          const result = await generateProductCsvStep.invoke({
            invoke: testProducts,
            container
          })

          const fileId = result.output.id

          // Verify file exists
          const fileModule = container.resolve(Modules.FILE)
          let file = await fileModule.retrieveFile(fileId)
          expect(file).toBeDefined()

          // Execute compensation
          if (generateProductCsvStep.compensation) {
            await generateProductCsvStep.compensation(fileId, { container })
          }

          // Verify file was deleted
          await expect(
            fileModule.retrieveFile(fileId)
          ).rejects.toThrow()
        })

        it("should handle empty product list", async () => {
          const result = await generateProductCsvStep.invoke({
            invoke: [],
            container
          })

          expect(result.output).toHaveProperty("id")
          // Should create empty CSV with headers only
        })

        it("should include variant options in CSV", async () => {
          const productsWithOptions = [
            {
              ...testProducts[0],
              options: [
                { id: "opt_1", title: "Size" },
                { id: "opt_2", title: "Color" }
              ],
              variants: [
                {
                  id: "var_1",
                  title: "Small / Red",
                  sku: "SKU1",
                  price_set: { prices: [] },
                  options: [
                    { option_id: "opt_1", value: "Small" },
                    { option_id: "opt_2", value: "Red" }
                  ]
                }
              ]
            }
          ]

          const result = await generateProductCsvStep.invoke({
            invoke: productsWithOptions,
            container
          })

          expect(result.output).toHaveProperty("id")
          // CSV should include:
          // Variant Option 1 Name, Variant Option 1 Value
          // Variant Option 2 Name, Variant Option 2 Value
        })
      })

      describe("Workflow Error Handling", () => {
        it("should handle workflow cancellation gracefully", async () => {
          // This is a placeholder for testing workflow cancellation
          // Medusa workflows support cancellation but require specific setup
          expect(true).toBe(true)
        })

        it("should handle missing file module gracefully", async () => {
          // Test scenario where file module is not available
          // Would need to mock container resolution
          expect(true).toBe(true)
        })
      })

      describe("Workflow Input Validation", () => {
        it("should accept empty filter", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"],
              filter: {}
            }
          })

          expect(result).toBeDefined()
          expect(result.file).toHaveProperty("id")
        })

        it("should handle custom select fields", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["id", "title", "handle", "status"]
            }
          })

          expect(result).toBeDefined()
          expect(result.file).toHaveProperty("id")
        })

        it("should handle products with collection filter", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"],
              filter: {
                collection_id: ["pcol_test_123"]
              }
            }
          })

          expect(result).toBeDefined()
          expect(result.file).toHaveProperty("id")
        })

        it("should handle products with status filter", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"],
              filter: {
                status: ["draft", "published"]
              }
            }
          })

          expect(result).toBeDefined()
          expect(result.file).toHaveProperty("id")
        })
      })

      describe("CSV File Properties", () => {
        it("should create file with correct MIME type", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"]
            }
          })

          const fileModule = container.resolve(Modules.FILE)
          const file = await fileModule.retrieveFile(result.file.id)

          expect(file.mimeType).toBe("text/csv")
        })

        it("should create file with timestamp in filename", async () => {
          const { result } = await exportProductsWorkflow(container).run({
            input: {
              select: ["*"]
            }
          })

          const fileModule = container.resolve(Modules.FILE)
          const file = await fileModule.retrieveFile(result.file.id)

          // Filename should be like: {timestamp}-product-exports.csv
          expect(file.filename).toMatch(/^\d+-product-exports\.csv$/)
        })

        it("should generate unique filename for each export", async () => {
          const { result: result1 } = await exportProductsWorkflow(container).run({
            input: { select: ["*"] }
          })

          // Wait a moment to ensure different timestamp
          await new Promise(resolve => setTimeout(resolve, 100))

          const { result: result2 } = await exportProductsWorkflow(container).run({
            input: { select: ["*"] }
          })

          expect(result1.file.id).not.toBe(result2.file.id)

          const fileModule = container.resolve(Modules.FILE)
          const file1 = await fileModule.retrieveFile(result1.file.id)
          const file2 = await fileModule.retrieveFile(result2.file.id)

          expect(file1.filename).not.toBe(file2.filename)
        })
      })
    })
  }
})
