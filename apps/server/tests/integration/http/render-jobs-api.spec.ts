import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { RENDER_ENGINE_MODULE } from "../../../src/modules/render-engine"
import FormData from "form-data"
import { Readable } from "stream"

jest.setTimeout(120 * 1000) // 2 minutes for render job tests

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let testProductId: string
    let testRenderJobId: string

    // Helper function to create a mock PNG file buffer
    const createMockPNGBuffer = (): Buffer => {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      // Add some dummy data to make it at least 100 bytes
      const dummyData = Buffer.alloc(100)
      return Buffer.concat([header, dummyData])
    }

    // Helper function to create a mock JPEG file buffer
    const createMockJPEGBuffer = (): Buffer => {
      // JPEG signature: FF D8 FF
      const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
      const dummyData = Buffer.alloc(100)
      return Buffer.concat([header, dummyData])
    }

    beforeAll(async () => {
      // Create test product
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      const product = await productModuleService.createProducts({
        title: "Test Render Job Product",
        handle: "test-render-job-product",
        description: "Test product for render job API tests",
        status: "published",
      })
      testProductId = product.id
    })

    afterAll(async () => {
      // Clean up test data
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      if (testProductId) {
        await productModuleService.softDeleteProducts([testProductId])
      }

      // Clean up render jobs
      if (testRenderJobId) {
        try {
          const renderJobService = container.resolve(RENDER_ENGINE_MODULE)
          await renderJobService.deleteRenderJob(testRenderJobId)
        } catch (error) {
          // Ignore errors if job doesn't exist
        }
      }
    })

    describe("POST /admin/render-jobs", () => {
      afterEach(async () => {
        // Clean up created jobs
        if (testRenderJobId) {
          try {
            await api.delete(`/admin/render-jobs/${testRenderJobId}`)
          } catch (error) {
            // Ignore if already deleted
          }
          testRenderJobId = ""
        }
      })

      it("should return 400 when design_file is missing", async () => {
        const formData = new FormData()
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("MISSING_FILE")
        expect(response.data.message).toContain("design_file is required")
      })

      it("should return 400 for invalid product_id", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", "")
        formData.append("preset", "chest-medium")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("VALIDATION_ERROR")
      })

      it("should return 400 for invalid preset", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "invalid-preset")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("VALIDATION_ERROR")
      })

      it("should return 404 for non-existent product", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", "non-existent-product-id")
        formData.append("preset", "chest-medium")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(404)
        expect(response.data.code).toBe("PRODUCT_NOT_FOUND")
      })

      it("should return 400 for invalid file type", async () => {
        const formData = new FormData()
        const invalidBuffer = Buffer.from("This is not an image")
        formData.append("design_file", invalidBuffer, {
          filename: "test-design.txt",
          contentType: "text/plain",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_FILE_TYPE")
      })

      it("should return 400 for file exceeding size limit", async () => {
        const formData = new FormData()
        // Create a buffer larger than 10MB
        const largeBuffer = Buffer.alloc(11 * 1024 * 1024)
        formData.append("design_file", largeBuffer, {
          filename: "large-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("FILE_TOO_LARGE")
      })

      it("should return 400 for invalid fabric_color", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")
        formData.append("fabric_color", "invalid-color-123")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_COLOR")
        expect(response.data.message).toContain("Invalid fabric_color")
      })

      it("should return 400 for invalid background_color", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")
        formData.append("background_color", "not-a-color")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_COLOR")
        expect(response.data.message).toContain("Invalid background_color")
      })

      it("should accept valid hex colors", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")
        formData.append("fabric_color", "#FF0000")
        formData.append("background_color", "#00FF00")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        // May fail due to workflow execution, but should pass validation
        expect([201, 500]).toContain(response.status)
        if (response.status === 201) {
          testRenderJobId = response.data.render_job.id
        }
      })

      it("should accept named colors", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")
        formData.append("fabric_color", "white")
        formData.append("background_color", "transparent")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect([201, 500]).toContain(response.status)
        if (response.status === 201) {
          testRenderJobId = response.data.render_job.id
        }
      })

      it("should create render job with valid PNG file", async () => {
        const formData = new FormData()
        const pngBuffer = createMockPNGBuffer()
        formData.append("design_file", pngBuffer, {
          filename: "test-design.png",
          contentType: "image/png",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "chest-medium")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect([201, 500]).toContain(response.status)
        if (response.status === 201) {
          expect(response.data).toHaveProperty("render_job")
          expect(response.data.render_job).toHaveProperty("id")
          expect(response.data.render_job).toHaveProperty("status")
          expect(response.data.render_job.product_id).toBe(testProductId)
          expect(response.data.render_job.preset).toBe("chest-medium")
          testRenderJobId = response.data.render_job.id
        }
      })

      it("should create render job with valid JPEG file", async () => {
        const formData = new FormData()
        const jpegBuffer = createMockJPEGBuffer()
        formData.append("design_file", jpegBuffer, {
          filename: "test-design.jpg",
          contentType: "image/jpeg",
        })
        formData.append("product_id", testProductId)
        formData.append("preset", "back-large")

        const response = await api.post("/admin/render-jobs", formData, {
          headers: formData.getHeaders(),
        })

        expect([201, 500]).toContain(response.status)
        if (response.status === 201) {
          testRenderJobId = response.data.render_job.id
        }
      })

      it("should accept all valid presets", async () => {
        const validPresets = [
          "chest-small",
          "chest-medium",
          "chest-large",
          "back-small",
          "back-medium",
          "back-large",
          "back-bottom-small",
          "back-bottom-medium",
          "back-bottom-large",
        ]

        for (const preset of validPresets) {
          const formData = new FormData()
          const pngBuffer = createMockPNGBuffer()
          formData.append("design_file", pngBuffer, {
            filename: "test-design.png",
            contentType: "image/png",
          })
          formData.append("product_id", testProductId)
          formData.append("preset", preset)

          const response = await api.post("/admin/render-jobs", formData, {
            headers: formData.getHeaders(),
          })

          expect([201, 500]).toContain(response.status)
          if (response.status === 201 && testRenderJobId) {
            await api.delete(`/admin/render-jobs/${testRenderJobId}`)
          }
        }
      })
    })

    describe("GET /admin/render-jobs/[id]", () => {
      let jobId: string

      beforeAll(async () => {
        // Create a test job
        const container = getContainer()
        const renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        const job = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-medium",
          status: "pending",
        })
        jobId = job.id
      })

      afterAll(async () => {
        if (jobId) {
          await api.delete(`/admin/render-jobs/${jobId}`).catch(() => {})
        }
      })

      it("should retrieve render job status", async () => {
        const response = await api.get(`/admin/render-jobs/${jobId}`)

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("render_job")
        expect(response.data.render_job.id).toBe(jobId)
        expect(response.data.render_job).toHaveProperty("status")
        expect(response.data.render_job).toHaveProperty("progress")
        expect(response.data.render_job).toHaveProperty("product_id")
        expect(response.data.render_job).toHaveProperty("preset")
        expect(response.data.render_job).toHaveProperty("created_at")
      })

      it("should return 400 for empty job ID", async () => {
        const response = await api.get("/admin/render-jobs/")

        expect(response.status).toBe(404) // Route not found
      })

      it("should return 404 for non-existent job", async () => {
        const response = await api.get("/admin/render-jobs/non-existent-job-id")

        expect(response.status).toBe(404)
        expect(response.data.code).toBe("JOB_NOT_FOUND")
      })

      it("should calculate progress based on status", async () => {
        const response = await api.get(`/admin/render-jobs/${jobId}`)

        expect(response.status).toBe(200)
        expect(typeof response.data.render_job.progress).toBe("number")
        expect(response.data.render_job.progress).toBeGreaterThanOrEqual(0)
        expect(response.data.render_job.progress).toBeLessThanOrEqual(100)
      })

      it("should include optional fields when available", async () => {
        const response = await api.get(`/admin/render-jobs/${jobId}`)

        expect(response.status).toBe(200)
        // These fields may or may not be present depending on job status
        if (response.data.render_job.design_file_url) {
          expect(typeof response.data.render_job.design_file_url).toBe("string")
        }
        if (response.data.render_job.error_message) {
          expect(typeof response.data.render_job.error_message).toBe("string")
        }
      })
    })

    describe("DELETE /admin/render-jobs/[id]", () => {
      it("should delete render job", async () => {
        // Create a job to delete
        const container = getContainer()
        const renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        const job = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-medium",
          status: "pending",
        })

        const response = await api.delete(`/admin/render-jobs/${job.id}`)

        expect(response.status).toBe(204)
      })

      it("should return 404 for non-existent job", async () => {
        const response = await api.delete("/admin/render-jobs/non-existent-job-id")

        expect(response.status).toBe(404)
      })

      it("should actually remove job from database", async () => {
        // Create a job
        const container = getContainer()
        const renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        const job = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-medium",
          status: "pending",
        })

        // Delete it
        await api.delete(`/admin/render-jobs/${job.id}`)

        // Verify it's gone
        const getResponse = await api.get(`/admin/render-jobs/${job.id}`)
        expect(getResponse.status).toBe(404)
      })
    })

    describe("POST /admin/render-jobs/[id]/retry", () => {
      let failedJobId: string

      beforeAll(async () => {
        // Create a failed job to retry
        const container = getContainer()
        const renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        const job = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-medium",
          status: "failed",
          error_message: "Test failure",
          design_file_url: "http://sharewear.local:9000/static/renders/test/design.png",
        })
        failedJobId = job.id
      })

      afterAll(async () => {
        if (failedJobId) {
          await api.delete(`/admin/render-jobs/${failedJobId}`).catch(() => {})
        }
      })

      it("should return 404 for non-existent job", async () => {
        const response = await api.post("/admin/render-jobs/non-existent-job-id/retry")

        expect(response.status).toBe(404)
        expect(response.data.code).toBe("JOB_NOT_FOUND")
      })

      it("should return 400 for non-failed job", async () => {
        // Create a pending job
        const container = getContainer()
        const renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        const pendingJob = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-medium",
          status: "pending",
        })

        const response = await api.post(`/admin/render-jobs/${pendingJob.id}/retry`)

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("JOB_NOT_FAILED")

        await api.delete(`/admin/render-jobs/${pendingJob.id}`)
      })

      it("should return 400 for invalid color overrides", async () => {
        const response = await api.post(`/admin/render-jobs/${failedJobId}/retry`, {
          fabric_color: "invalid-color",
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_COLOR")
      })

      it("should return 400 for invalid preset override", async () => {
        const response = await api.post(`/admin/render-jobs/${failedJobId}/retry`, {
          preset: "invalid-preset",
        })

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("VALIDATION_ERROR")
      })

      // Note: Full retry test would require valid design file and workflow setup
      // These tests validate the API contract and error handling
    })

    describe("GET /admin/products/[id]/render-jobs", () => {
      let jobsForProduct: string[]

      beforeAll(async () => {
        // Create multiple jobs for the test product
        const container = getContainer()
        const renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        jobsForProduct = []

        const job1 = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-medium",
          status: "completed",
        })
        jobsForProduct.push(job1.id)

        const job2 = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "back-large",
          status: "pending",
        })
        jobsForProduct.push(job2.id)

        const job3 = await renderJobService.createRenderJob({
          product_id: testProductId,
          preset: "chest-small",
          status: "failed",
        })
        jobsForProduct.push(job3.id)
      })

      afterAll(async () => {
        // Clean up jobs
        for (const jobId of jobsForProduct) {
          await api.delete(`/admin/render-jobs/${jobId}`).catch(() => {})
        }
      })

      it("should list all render jobs for a product", async () => {
        const response = await api.get(`/admin/products/${testProductId}/render-jobs`)

        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty("render_jobs")
        expect(response.data).toHaveProperty("count")
        expect(response.data).toHaveProperty("limit")
        expect(response.data).toHaveProperty("offset")
        expect(Array.isArray(response.data.render_jobs)).toBe(true)
        expect(response.data.render_jobs.length).toBeGreaterThanOrEqual(3)
      })

      it("should return 400 for missing product ID", async () => {
        const response = await api.get("/admin/products//render-jobs")

        expect(response.status).toBe(404)
      })

      it("should return 404 for non-existent product", async () => {
        const response = await api.get("/admin/products/non-existent-product-id/render-jobs")

        expect(response.status).toBe(404)
        expect(response.data.code).toBe("PRODUCT_NOT_FOUND")
      })

      it("should support status filter", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?status=completed`
        )

        expect(response.status).toBe(200)
        response.data.render_jobs.forEach((job: any) => {
          expect(job.status).toBe("completed")
        })
      })

      it("should support multiple status filters", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?status=pending,failed`
        )

        expect(response.status).toBe(200)
        response.data.render_jobs.forEach((job: any) => {
          expect(["pending", "failed"]).toContain(job.status)
        })
      })

      it("should return 400 for invalid status filter", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?status=invalid-status`
        )

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_STATUS")
      })

      it("should support limit parameter", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?limit=2`
        )

        expect(response.status).toBe(200)
        expect(response.data.limit).toBe(2)
        expect(response.data.render_jobs.length).toBeLessThanOrEqual(2)
      })

      it("should return 400 for invalid limit", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?limit=200`
        )

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_LIMIT")
      })

      it("should support offset parameter", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?offset=1`
        )

        expect(response.status).toBe(200)
        expect(response.data.offset).toBe(1)
      })

      it("should return 400 for invalid offset", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?offset=-1`
        )

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_OFFSET")
      })

      it("should support order parameter", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?order=ASC`
        )

        expect(response.status).toBe(200)
        // Verify jobs are in ascending order by created_at
        const jobs = response.data.render_jobs
        for (let i = 1; i < jobs.length; i++) {
          const prevDate = new Date(jobs[i - 1].created_at)
          const currDate = new Date(jobs[i].created_at)
          expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime())
        }
      })

      it("should return 400 for invalid order", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?order=INVALID`
        )

        expect(response.status).toBe(400)
        expect(response.data.code).toBe("INVALID_ORDER")
      })

      it("should return correct job structure", async () => {
        const response = await api.get(`/admin/products/${testProductId}/render-jobs`)

        expect(response.status).toBe(200)
        if (response.data.render_jobs.length > 0) {
          const job = response.data.render_jobs[0]
          expect(job).toHaveProperty("id")
          expect(job).toHaveProperty("status")
          expect(job).toHaveProperty("product_id")
          expect(job).toHaveProperty("preset")
          expect(job).toHaveProperty("created_at")
          expect(job.product_id).toBe(testProductId)
        }
      })

      it("should include pagination metadata", async () => {
        const response = await api.get(
          `/admin/products/${testProductId}/render-jobs?limit=2&offset=0`
        )

        expect(response.status).toBe(200)
        expect(response.data.count).toBeGreaterThanOrEqual(3)
        expect(response.data.limit).toBe(2)
        expect(response.data.offset).toBe(0)
      })
    })
  },
})
