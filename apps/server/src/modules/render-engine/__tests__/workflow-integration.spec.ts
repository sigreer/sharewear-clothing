/**
 * Integration Tests: Render Workflow
 *
 * Tests the complete render workflow end-to-end with real database operations,
 * service integration, and file management. Python/Blender execution is mocked
 * since those are tested in unit tests and require external dependencies.
 *
 * @integration
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaError } from "@medusajs/framework/utils"
import { RENDER_ENGINE_MODULE } from "../types"
import RenderJobService from "../services/render-job-service"
import type { CreateRenderJobInput } from "../services/render-job-service"
import type { RenderJobStatus } from "../types"

// Set longer timeout for integration tests
jest.setTimeout(60000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("Render Workflow Integration Tests", () => {
      let container: any
      let renderJobService: RenderJobService
      let testProductId: string

      beforeAll(async () => {
        container = getContainer()
        renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        // Use a consistent test product ID
        testProductId = "prod_test_render_workflow_01"
      })

      beforeEach(async () => {
        // Clean up any existing test jobs before each test
        try {
          const existingJobs = await renderJobService.getJobsByProduct(testProductId)
          for (const job of existingJobs) {
            await renderJobService.deleteRenderJob(job.id)
          }
        } catch (error) {
          // Ignore if jobs don't exist
        }
      })

      afterEach(async () => {
        // Clean up test data after each test
        try {
          const jobs = await renderJobService.getJobsByProduct(testProductId)
          for (const job of jobs) {
            await renderJobService.deleteRenderJob(job.id)
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      })

      describe("1. Successful Render Flow", () => {
        describe("Job Creation and Initialization", () => {
          it("should create render job with correct initial state", async () => {
            const jobData: CreateRenderJobInput = {
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test-design.png",
              preset: "chest-medium",
              metadata: {
                test: true,
                workflow_started_at: new Date().toISOString()
              }
            }

            const job = await renderJobService.createRenderJob(jobData)

            expect(job).toBeDefined()
            expect(job.id).toBeDefined()
            expect(job.product_id).toBe(testProductId)
            expect(job.preset).toBe("chest-medium")
            expect(job.status).toBe("pending")
            expect(job.design_file_url).toBe(jobData.design_file_url)
            expect(job.composited_file_url).toBeNull()
            expect(job.rendered_image_url).toBeNull()
            expect(job.animation_url).toBeNull()
            expect(job.error_message).toBeNull()
            expect(job.started_at).toBeNull()
            expect(job.completed_at).toBeNull()
            expect(job.created_at).toBeDefined()
            expect(job.updated_at).toBeDefined()
          })

          it("should store metadata correctly", async () => {
            const metadata = {
              test: true,
              custom_field: "value",
              nested: { key: "value" }
            }

            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "back-large",
              metadata
            })

            expect(job.metadata).toEqual(metadata)
          })

          it("should create job with variant_id when provided", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              variant_id: "variant_123",
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-small"
            })

            expect(job.variant_id).toBe("variant_123")
          })

          it("should create job with template_id when provided", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium",
              template_id: "template_abc"
            })

            expect(job.template_id).toBe("template_abc")
          })
        })

        describe("Job Status Progression", () => {
          it("should transition from pending to compositing", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            expect(job.status).toBe("pending")
            expect(job.started_at).toBeNull()

            const updated = await renderJobService.updateJobStatus(job.id, "compositing")

            expect(updated.status).toBe("compositing")
            expect(updated.started_at).not.toBeNull()
            expect(updated.completed_at).toBeNull()
          })

          it("should transition from compositing to rendering", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")
            const updated = await renderJobService.updateJobStatus(job.id, "rendering")

            expect(updated.status).toBe("rendering")
            expect(updated.started_at).not.toBeNull()
            expect(updated.completed_at).toBeNull()
          })

          it("should transition from rendering to completed", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")
            await renderJobService.updateJobStatus(job.id, "rendering")
            const updated = await renderJobService.updateJobStatus(job.id, "completed")

            expect(updated.status).toBe("completed")
            expect(updated.started_at).not.toBeNull()
            expect(updated.completed_at).not.toBeNull()
          })

          it("should allow failure from any active state", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            // Test failure from pending
            const failedJob = await renderJobService.updateJobStatus(
              job.id,
              "failed",
              { error_message: "Test error" }
            )

            expect(failedJob.status).toBe("failed")
            expect(failedJob.error_message).toBe("Test error")
            expect(failedJob.completed_at).not.toBeNull()
          })

          it("should allow failure from compositing state", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")
            const failed = await renderJobService.updateJobStatus(
              job.id,
              "failed",
              { error_message: "Composition failed" }
            )

            expect(failed.status).toBe("failed")
            expect(failed.error_message).toBe("Composition failed")
          })

          it("should allow failure from rendering state", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")
            await renderJobService.updateJobStatus(job.id, "rendering")
            const failed = await renderJobService.updateJobStatus(
              job.id,
              "failed",
              { error_message: "Render failed" }
            )

            expect(failed.status).toBe("failed")
            expect(failed.error_message).toBe("Render failed")
          })
        })

        describe("Result File Updates", () => {
          it("should update composited file URL", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const updated = await renderJobService.updateJobResults(job.id, {
              composited_file_url: "http://sharewear.local:9000/renders/composited.png"
            })

            expect(updated.composited_file_url).toBe("http://sharewear.local:9000/renders/composited.png")
            expect(updated.rendered_image_url).toBeNull()
            expect(updated.animation_url).toBeNull()
          })

          it("should update rendered image URL", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobResults(job.id, {
              composited_file_url: "http://sharewear.local:9000/renders/composited.png"
            })

            const updated = await renderJobService.updateJobResults(job.id, {
              rendered_image_url: "http://sharewear.local:9000/renders/result.png"
            })

            expect(updated.composited_file_url).toBe("http://sharewear.local:9000/renders/composited.png")
            expect(updated.rendered_image_url).toBe("http://sharewear.local:9000/renders/result.png")
          })

          it("should update animation URL", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const updated = await renderJobService.updateJobResults(job.id, {
              animation_url: "http://sharewear.local:9000/renders/turntable.mp4"
            })

            expect(updated.animation_url).toBe("http://sharewear.local:9000/renders/turntable.mp4")
          })

          it("should update multiple result URLs at once", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const updated = await renderJobService.updateJobResults(job.id, {
              composited_file_url: "http://sharewear.local:9000/renders/composited.png",
              rendered_image_url: "http://sharewear.local:9000/renders/result.png",
              animation_url: "http://sharewear.local:9000/renders/turntable.mp4"
            })

            expect(updated.composited_file_url).toBe("http://sharewear.local:9000/renders/composited.png")
            expect(updated.rendered_image_url).toBe("http://sharewear.local:9000/renders/result.png")
            expect(updated.animation_url).toBe("http://sharewear.local:9000/renders/turntable.mp4")
          })
        })
      })

      describe("2. Failure Compensation", () => {
        describe("Invalid Status Transitions", () => {
          it("should reject invalid status transitions", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            // Cannot go from pending to rendering (must go through compositing)
            await expect(
              renderJobService.updateJobStatus(job.id, "rendering")
            ).rejects.toThrow(MedusaError)
            await expect(
              renderJobService.updateJobStatus(job.id, "rendering")
            ).rejects.toThrow(/Invalid status transition/)
          })

          it("should reject transitions from terminal state (completed)", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")
            await renderJobService.updateJobStatus(job.id, "rendering")
            await renderJobService.updateJobStatus(job.id, "completed")

            // Cannot transition from completed to any other state
            await expect(
              renderJobService.updateJobStatus(job.id, "pending")
            ).rejects.toThrow(MedusaError)
          })

          it("should reject transitions from terminal state (failed)", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "failed", {
              error_message: "Test failure"
            })

            // Cannot transition from failed to any other state
            await expect(
              renderJobService.updateJobStatus(job.id, "pending")
            ).rejects.toThrow(MedusaError)
          })

          it("should allow idempotent status updates", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")

            // Should allow updating to same status
            const updated = await renderJobService.updateJobStatus(job.id, "compositing")
            expect(updated.status).toBe("compositing")
          })
        })

        describe("Error Handling", () => {
          it("should capture error message on failure", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const errorMessage = "Python script failed: Template file not found"
            const failed = await renderJobService.updateJobStatus(job.id, "failed", {
              error_message: errorMessage
            })

            expect(failed.status).toBe("failed")
            expect(failed.error_message).toBe(errorMessage)
            expect(failed.completed_at).not.toBeNull()
          })

          it("should handle job not found errors", async () => {
            await expect(
              renderJobService.getRenderJob("invalid_job_id")
            ).resolves.toBeNull()

            await expect(
              renderJobService.updateJobStatus("invalid_job_id", "compositing")
            ).rejects.toThrow(MedusaError)
            await expect(
              renderJobService.updateJobStatus("invalid_job_id", "compositing")
            ).rejects.toThrow(/not found/)
          })

          it("should handle delete of non-existent job", async () => {
            await expect(
              renderJobService.deleteRenderJob("invalid_job_id")
            ).rejects.toThrow(MedusaError)
            await expect(
              renderJobService.deleteRenderJob("invalid_job_id")
            ).rejects.toThrow(/not found/)
          })
        })

        describe("Retry Functionality", () => {
          it("should allow retrying failed jobs", async () => {
            const originalJob = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium",
              metadata: { attempt: 1 }
            })

            await renderJobService.updateJobStatus(originalJob.id, "failed", {
              error_message: "Test failure"
            })

            const retryJob = await renderJobService.retryRenderJob(originalJob.id)

            expect(retryJob.id).not.toBe(originalJob.id)
            expect(retryJob.status).toBe("pending")
            expect(retryJob.product_id).toBe(originalJob.product_id)
            expect(retryJob.design_file_url).toBe(originalJob.design_file_url)
            expect(retryJob.preset).toBe(originalJob.preset)
            expect(retryJob.metadata).toHaveProperty("retried_from", originalJob.id)
            expect(retryJob.metadata).toHaveProperty("retry_count", 1)
          })

          it("should increment retry count on multiple retries", async () => {
            const originalJob = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(originalJob.id, "failed")

            const retry1 = await renderJobService.retryRenderJob(originalJob.id)
            await renderJobService.updateJobStatus(retry1.id, "failed")

            const retry2 = await renderJobService.retryRenderJob(retry1.id)

            expect(retry2.metadata).toHaveProperty("retry_count", 2)
          })

          it("should reject retry of non-failed jobs", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await expect(
              renderJobService.retryRenderJob(job.id)
            ).rejects.toThrow(MedusaError)
            await expect(
              renderJobService.retryRenderJob(job.id)
            ).rejects.toThrow(/must be 'failed'/)
          })
        })
      })

      describe("3. Database Operations", () => {
        describe("Job Queries", () => {
          it("should retrieve job by ID", async () => {
            const created = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const retrieved = await renderJobService.getRenderJob(created.id)

            expect(retrieved).toBeDefined()
            expect(retrieved?.id).toBe(created.id)
            expect(retrieved?.product_id).toBe(created.product_id)
          })

          it("should list jobs by product", async () => {
            // Create multiple jobs for the same product
            await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test1.png",
              preset: "chest-small"
            })
            await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test2.png",
              preset: "chest-medium"
            })

            const jobs = await renderJobService.getJobsByProduct(testProductId)

            expect(jobs.length).toBeGreaterThanOrEqual(2)
            expect(jobs.every(j => j.product_id === testProductId)).toBe(true)
          })

          it("should list jobs by status", async () => {
            const job1 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test1.png",
              preset: "chest-medium"
            })

            const job2 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test2.png",
              preset: "back-large"
            })

            await renderJobService.updateJobStatus(job1.id, "compositing")

            const pendingJobs = await renderJobService.getJobsByStatus("pending")
            const compositingJobs = await renderJobService.getJobsByStatus("compositing")

            expect(pendingJobs.some(j => j.id === job2.id)).toBe(true)
            expect(compositingJobs.some(j => j.id === job1.id)).toBe(true)
          })

          it("should get active jobs across all statuses", async () => {
            const job1 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test1.png",
              preset: "chest-medium"
            })

            const job2 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test2.png",
              preset: "back-large"
            })

            const job3 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test3.png",
              preset: "chest-large"
            })

            await renderJobService.updateJobStatus(job1.id, "compositing")
            await renderJobService.updateJobStatus(job2.id, "compositing")
            await renderJobService.updateJobStatus(job2.id, "rendering")
            await renderJobService.updateJobStatus(job3.id, "compositing")
            await renderJobService.updateJobStatus(job3.id, "rendering")
            await renderJobService.updateJobStatus(job3.id, "completed")

            const activeJobs = await renderJobService.getActiveJobs()

            // Should include pending, compositing, and rendering jobs
            const activeJobIds = activeJobs.map(j => j.id)
            expect(activeJobIds).toContain(job1.id) // compositing
            expect(activeJobIds).toContain(job2.id) // rendering
            expect(activeJobIds).not.toContain(job3.id) // completed
          })

          it("should check if product has active renders", async () => {
            const hasActiveBefore = await renderJobService.hasActiveRenders(testProductId)
            expect(hasActiveBefore).toBe(false)

            await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const hasActiveAfter = await renderJobService.hasActiveRenders(testProductId)
            expect(hasActiveAfter).toBe(true)
          })
        })

        describe("Job Statistics", () => {
          it("should calculate product render statistics", async () => {
            const job1 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test1.png",
              preset: "chest-medium"
            })
            const job2 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test2.png",
              preset: "back-large"
            })
            const job3 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test3.png",
              preset: "chest-large"
            })

            await renderJobService.updateJobStatus(job1.id, "compositing")
            await renderJobService.updateJobStatus(job2.id, "compositing")
            await renderJobService.updateJobStatus(job2.id, "rendering")
            await renderJobService.updateJobStatus(job2.id, "completed")
            await renderJobService.updateJobStatus(job3.id, "failed")

            const stats = await renderJobService.getProductRenderStats(testProductId)

            expect(stats.total).toBe(3)
            expect(stats.pending).toBe(0)
            expect(stats.compositing).toBe(1)
            expect(stats.rendering).toBe(0)
            expect(stats.completed).toBe(1)
            expect(stats.failed).toBe(1)
          })
        })

        describe("Pagination and Filtering", () => {
          it("should paginate job listings", async () => {
            // Create 5 jobs
            for (let i = 0; i < 5; i++) {
              await renderJobService.createRenderJob({
                product_id: testProductId,
                design_file_url: `http://sharewear.local:9000/uploads/test${i}.png`,
                preset: "chest-medium"
              })
            }

            const page1 = await renderJobService.listRenderJobsWithCount({
              product_id: testProductId,
              limit: 2,
              offset: 0
            })

            const page2 = await renderJobService.listRenderJobsWithCount({
              product_id: testProductId,
              limit: 2,
              offset: 2
            })

            expect(page1.jobs.length).toBe(2)
            expect(page2.jobs.length).toBe(2)
            expect(page1.count).toBe(5)
            expect(page2.count).toBe(5)
            expect(page1.jobs[0].id).not.toBe(page2.jobs[0].id)
          })

          it("should filter jobs by status with pagination", async () => {
            const job1 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test1.png",
              preset: "chest-medium"
            })
            const job2 = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test2.png",
              preset: "back-large"
            })

            await renderJobService.updateJobStatus(job1.id, "compositing")

            const result = await renderJobService.listRenderJobsWithCount({
              product_id: testProductId,
              status: "compositing",
              limit: 10
            })

            expect(result.jobs.length).toBe(1)
            expect(result.jobs[0].id).toBe(job1.id)
            expect(result.jobs[0].status).toBe("compositing")
          })
        })

        describe("Cleanup Operations", () => {
          it("should delete render job", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const retrieved = await renderJobService.getRenderJob(job.id)
            expect(retrieved).not.toBeNull()

            await renderJobService.deleteRenderJob(job.id)

            const afterDelete = await renderJobService.getRenderJob(job.id)
            expect(afterDelete).toBeNull()
          })

          it("should cleanup old failed jobs", async () => {
            const oldDate = new Date()
            oldDate.setDate(oldDate.getDate() - 10)

            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "failed", {
              error_message: "Test failure",
              completed_at: oldDate
            })

            const deletedCount = await renderJobService.cleanupOldJobs(7)

            expect(deletedCount).toBeGreaterThanOrEqual(1)

            const afterCleanup = await renderJobService.getRenderJob(job.id)
            expect(afterCleanup).toBeNull()
          })

          it("should not cleanup recent failed jobs", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "failed", {
              error_message: "Recent failure"
            })

            const deletedCount = await renderJobService.cleanupOldJobs(7)

            const afterCleanup = await renderJobService.getRenderJob(job.id)
            expect(afterCleanup).not.toBeNull()
          })
        })
      })

      describe("4. Edge Cases and Validation", () => {
        describe("Input Validation", () => {
          it("should reject job creation with missing product_id", async () => {
            await expect(
              renderJobService.createRenderJob({
                product_id: "",
                design_file_url: "http://sharewear.local:9000/uploads/test.png",
                preset: "chest-medium"
              })
            ).rejects.toThrow(MedusaError)
          })

          it("should reject job creation with invalid URL", async () => {
            await expect(
              renderJobService.createRenderJob({
                product_id: testProductId,
                design_file_url: "not-a-valid-url",
                preset: "chest-medium"
              })
            ).rejects.toThrow(MedusaError)
            await expect(
              renderJobService.createRenderJob({
                product_id: testProductId,
                design_file_url: "not-a-valid-url",
                preset: "chest-medium"
              })
            ).rejects.toThrow(/must be a valid URL/)
          })

          it("should reject job creation with invalid preset", async () => {
            await expect(
              renderJobService.createRenderJob({
                product_id: testProductId,
                design_file_url: "http://sharewear.local:9000/uploads/test.png",
                preset: "invalid-preset" as any
              })
            ).rejects.toThrow(MedusaError)
          })

          it("should accept all valid preset values", async () => {
            const validPresets = [
              "chest-small",
              "chest-medium",
              "chest-large",
              "back-small",
              "back-medium",
              "back-large",
              "back-bottom-small",
              "back-bottom-medium",
              "back-bottom-large"
            ]

            for (const preset of validPresets) {
              const job = await renderJobService.createRenderJob({
                product_id: testProductId,
                design_file_url: "http://sharewear.local:9000/uploads/test.png",
                preset: preset as any
              })
              expect(job.preset).toBe(preset)
              await renderJobService.deleteRenderJob(job.id)
            }
          })
        })

        describe("Timestamp Management", () => {
          it("should set started_at when transitioning to compositing", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            expect(job.started_at).toBeNull()

            const updated = await renderJobService.updateJobStatus(job.id, "compositing")

            expect(updated.started_at).not.toBeNull()
            expect(new Date(updated.started_at!).getTime()).toBeLessThanOrEqual(Date.now())
          })

          it("should not overwrite started_at on subsequent updates", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const compositing = await renderJobService.updateJobStatus(job.id, "compositing")
            const startedAt = compositing.started_at

            // Wait a bit to ensure timestamp would be different if overwritten
            await new Promise(resolve => setTimeout(resolve, 10))

            const rendering = await renderJobService.updateJobStatus(job.id, "rendering")

            expect(rendering.started_at).toEqual(startedAt)
          })

          it("should set completed_at when transitioning to completed", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            await renderJobService.updateJobStatus(job.id, "compositing")
            await renderJobService.updateJobStatus(job.id, "rendering")

            expect(job.completed_at).toBeNull()

            const completed = await renderJobService.updateJobStatus(job.id, "completed")

            expect(completed.completed_at).not.toBeNull()
            expect(new Date(completed.completed_at!).getTime()).toBeLessThanOrEqual(Date.now())
          })

          it("should set completed_at when transitioning to failed", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            const failed = await renderJobService.updateJobStatus(job.id, "failed", {
              error_message: "Test error"
            })

            expect(failed.completed_at).not.toBeNull()
          })
        })

        describe("Concurrent Operations", () => {
          it("should handle concurrent job creation for same product", async () => {
            const promises = Array(3).fill(null).map((_, i) =>
              renderJobService.createRenderJob({
                product_id: testProductId,
                design_file_url: `http://sharewear.local:9000/uploads/test${i}.png`,
                preset: "chest-medium"
              })
            )

            const jobs = await Promise.all(promises)

            expect(jobs.length).toBe(3)
            expect(new Set(jobs.map(j => j.id)).size).toBe(3) // All unique IDs
          })

          it("should handle concurrent status updates safely", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            // Update to compositing
            await renderJobService.updateJobStatus(job.id, "compositing")

            // Attempt multiple concurrent updates
            const promises = [
              renderJobService.updateJobResults(job.id, {
                composited_file_url: "http://sharewear.local:9000/renders/composited.png"
              }),
              renderJobService.updateJobStatus(job.id, "rendering")
            ]

            await Promise.all(promises)

            const final = await renderJobService.getRenderJob(job.id)
            expect(final?.status).toBe("rendering")
            expect(final?.composited_file_url).toBe("http://sharewear.local:9000/renders/composited.png")
          })
        })

        describe("Null and Empty Handling", () => {
          it("should handle empty product_id in queries gracefully", async () => {
            const jobs = await renderJobService.getJobsByProduct("")
            expect(jobs).toEqual([])
          })

          it("should handle null variant_id correctly", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              variant_id: null,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium"
            })

            expect(job.variant_id).toBeNull()
          })

          it("should handle null template_id correctly", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium",
              template_id: null
            })

            expect(job.template_id).toBeNull()
          })

          it("should handle null metadata correctly", async () => {
            const job = await renderJobService.createRenderJob({
              product_id: testProductId,
              design_file_url: "http://sharewear.local:9000/uploads/test.png",
              preset: "chest-medium",
              metadata: null
            })

            expect(job.metadata).toBeNull()
          })
        })
      })
    })
  }
})
