/**
 * Integration Tests: Render Workflow Steps
 *
 * Tests individual workflow steps in isolation with real database operations
 * and mocked external dependencies (Python/Blender execution).
 *
 * @integration
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaError } from "@medusajs/framework/utils"
import { RENDER_ENGINE_MODULE } from "../../types"
import RenderJobService from "../../services/render-job-service"
import FileManagementService from "../../services/file-management-service"
import PythonExecutorService from "../../services/python-executor-service"
import MediaAssociationService from "../../services/media-association-service"

// Import workflow steps
import { createRenderJobStep } from "../../../../workflows/render-engine/steps/create-render-job-step"
import { uploadDesignFileStep } from "../../../../workflows/render-engine/steps/upload-design-file-step"
import { composeDesignStep } from "../../../../workflows/render-engine/steps/compose-design-step"
import { renderDesignStep } from "../../../../workflows/render-engine/steps/render-design-step"
import { storeRenderOutputsStep } from "../../../../workflows/render-engine/steps/store-render-outputs-step"
import { completeRenderJobStep } from "../../../../workflows/render-engine/steps/complete-render-job-step"

// Set longer timeout for integration tests
jest.setTimeout(60000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("Render Workflow Step Integration Tests", () => {
      let container: any
      let renderJobService: RenderJobService
      let fileManagementService: FileManagementService
      let pythonExecutorService: PythonExecutorService
      let mediaAssociationService: MediaAssociationService
      let testProductId: string

      beforeAll(async () => {
        container = getContainer()
        renderJobService = container.resolve(RENDER_ENGINE_MODULE)

        // Create service instances with logger
        const logger = container.resolve("logger")
        fileManagementService = new FileManagementService({ logger })
        pythonExecutorService = new PythonExecutorService({ logger })
        mediaAssociationService = new MediaAssociationService({ logger })

        testProductId = "prod_test_workflow_steps_01"
      })

      beforeEach(async () => {
        // Clean up any existing test jobs
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

      describe("Step 1: Create Render Job Step", () => {
        it("should create job with correct initial state", async () => {
          const stepInput = {
            productId: testProductId,
            preset: "chest-medium" as const
          }

          // Execute step
          const result = await createRenderJobStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result).toBeDefined()
          expect(result.output).toHaveProperty("jobId")
          expect(result.output).toHaveProperty("productId", testProductId)
          expect(result.output).toHaveProperty("preset", "chest-medium")

          // Verify job was created in database
          const job = await renderJobService.getRenderJob(result.output.jobId)
          expect(job).toBeDefined()
          expect(job?.status).toBe("pending")
          expect(job?.product_id).toBe(testProductId)
          expect(job?.preset).toBe("chest-medium")
        })

        it("should include workflow_started_at in metadata", async () => {
          const stepInput = {
            productId: testProductId,
            preset: "chest-large" as const
          }

          const result = await createRenderJobStep.invoke({
            invoke: stepInput,
            container
          })

          const job = await renderJobService.getRenderJob(result.output.jobId)
          expect(job?.metadata).toHaveProperty("workflow_started_at")
          expect(typeof job?.metadata?.workflow_started_at).toBe("string")
        })

        it("should run compensation on failure (cleanup job)", async () => {
          const stepInput = {
            productId: testProductId,
            preset: "back-small" as const
          }

          const result = await createRenderJobStep.invoke({
            invoke: stepInput,
            container
          })

          const jobId = result.output.jobId

          // Verify job exists
          let job = await renderJobService.getRenderJob(jobId)
          expect(job).toBeDefined()

          // Execute compensation
          if (createRenderJobStep.compensation) {
            await createRenderJobStep.compensation(jobId, { container })
          }

          // Verify job was deleted
          job = await renderJobService.getRenderJob(jobId)
          expect(job).toBeNull()
        })
      })

      describe("Step 2: Upload Design File Step", () => {
        let testJobId: string

        beforeEach(async () => {
          // Create a job first
          const job = await renderJobService.createRenderJob({
            product_id: testProductId,
            design_file_url: null,
            preset: "chest-medium"
          })
          testJobId = job.id
        })

        it("should upload design file and update job", async () => {
          const designBuffer = Buffer.from("fake-image-data")
          const stepInput = {
            jobId: testJobId,
            designFile: designBuffer,
            filename: "test-design.png",
            mimetype: "image/png"
          }

          // Mock file upload
          const mockUploadResult = {
            url: "http://sharewear.local:9000/uploads/test-design.png",
            path: "/tmp/uploads/test-design.png"
          }

          jest.spyOn(fileManagementService, "uploadDesignFile").mockResolvedValue(mockUploadResult)
          jest.spyOn(fileManagementService, "createTempDirectory").mockResolvedValue(undefined)

          const result = await uploadDesignFileStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result.output).toHaveProperty("designUrl", mockUploadResult.url)
          expect(result.output).toHaveProperty("designPath", mockUploadResult.path)

          // Verify job was updated with design URL
          const updatedJob = await renderJobService.getRenderJob(testJobId)
          expect(updatedJob?.design_file_url).toBe(mockUploadResult.url)
        })

        it("should create temporary working directory", async () => {
          const stepInput = {
            jobId: testJobId,
            designFile: Buffer.from("test"),
            filename: "test.png",
            mimetype: "image/png"
          }

          const mockUploadResult = {
            url: "http://test.com/file.png",
            path: "/tmp/file.png"
          }

          const uploadSpy = jest.spyOn(fileManagementService, "uploadDesignFile").mockResolvedValue(mockUploadResult)
          const tempDirSpy = jest.spyOn(fileManagementService, "createTempDirectory").mockResolvedValue(undefined)

          await uploadDesignFileStep.invoke({
            invoke: stepInput,
            container
          })

          expect(tempDirSpy).toHaveBeenCalledWith(testJobId)
        })

        it("should run compensation on failure (cleanup files)", async () => {
          const cleanupSpy = jest.spyOn(fileManagementService, "cleanupJobFiles").mockResolvedValue(undefined)

          if (uploadDesignFileStep.compensation) {
            await uploadDesignFileStep.compensation(testJobId, { container })
          }

          expect(cleanupSpy).toHaveBeenCalledWith(testJobId)
        })
      })

      describe("Step 3: Compose Design Step", () => {
        let testJobId: string

        beforeEach(async () => {
          const job = await renderJobService.createRenderJob({
            product_id: testProductId,
            design_file_url: "http://test.com/design.png",
            preset: "chest-medium"
          })
          testJobId = job.id
        })

        it("should execute composition and update job status", async () => {
          const stepInput = {
            jobId: testJobId,
            templatePath: "/templates/tshirt-template.png",
            designPath: "/tmp/design.png",
            preset: "chest-medium" as const,
            fabricColor: "#FFFFFF"
          }

          const mockCompositeResult = {
            success: true,
            outputPath: "/tmp/composited.png"
          }

          const mockStoreResult = {
            url: "http://sharewear.local:9000/renders/composited.png",
            path: "/storage/composited.png"
          }

          jest.spyOn(pythonExecutorService, "executeCompose").mockResolvedValue(mockCompositeResult)
          jest.spyOn(fileManagementService, "getTempFilePath").mockResolvedValue("/tmp/composited.png")
          jest.spyOn(fileManagementService, "storeRenderOutput").mockResolvedValue(mockStoreResult)

          const result = await composeDesignStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result.output).toHaveProperty("compositedPath")
          expect(result.output).toHaveProperty("compositedUrl", mockStoreResult.url)

          // Verify job status was updated
          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.status).toBe("compositing")
          expect(job?.composited_file_url).toBe(mockStoreResult.url)
        })

        it("should throw error when composition fails", async () => {
          const stepInput = {
            jobId: testJobId,
            templatePath: "/templates/tshirt-template.png",
            designPath: "/tmp/design.png",
            preset: "chest-medium" as const
          }

          const mockFailResult = {
            success: false,
            error: "Template file not found"
          }

          jest.spyOn(pythonExecutorService, "executeCompose").mockResolvedValue(mockFailResult)
          jest.spyOn(fileManagementService, "getTempFilePath").mockResolvedValue("/tmp/composited.png")

          await expect(
            composeDesignStep.invoke({
              invoke: stepInput,
              container
            })
          ).rejects.toThrow(/Design composition failed/)
        })

        it("should mark job as failed on compensation", async () => {
          const compensationData = {
            jobId: testJobId,
            compositedPath: "/tmp/composited.png"
          }

          if (composeDesignStep.compensation) {
            await composeDesignStep.compensation(compensationData, { container })
          }

          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.status).toBe("failed")
          expect(job?.error_message).toContain("composition step")
        })
      })

      describe("Step 4: Render Design Step", () => {
        let testJobId: string

        beforeEach(async () => {
          const job = await renderJobService.createRenderJob({
            product_id: testProductId,
            design_file_url: "http://test.com/design.png",
            preset: "chest-medium"
          })
          testJobId = job.id
        })

        it("should execute 3D rendering and update job status", async () => {
          const stepInput = {
            jobId: testJobId,
            blendFile: "/templates/tshirt.blend",
            texturePath: "/tmp/composited.png",
            samples: 128,
            renderMode: "all" as const,
            backgroundColor: "transparent"
          }

          const mockRenderResult = {
            success: true,
            renderedImages: [
              "/tmp/renders/front.png",
              "/tmp/renders/back.png",
              "/tmp/renders/left.png",
              "/tmp/renders/right.png",
              "/tmp/renders/top.png",
              "/tmp/renders/bottom.png"
            ],
            animation: "/tmp/renders/turntable.mp4"
          }

          jest.spyOn(pythonExecutorService, "executeRender").mockResolvedValue(mockRenderResult)
          jest.spyOn(fileManagementService, "getTempFilePath").mockResolvedValue("/tmp/renders")

          const result = await renderDesignStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result.output).toHaveProperty("renderedImages")
          expect(result.output.renderedImages).toHaveLength(6)
          expect(result.output).toHaveProperty("animation", mockRenderResult.animation)

          // Verify job status was updated
          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.status).toBe("rendering")
        })

        it("should throw error when rendering fails", async () => {
          const stepInput = {
            jobId: testJobId,
            blendFile: "/templates/tshirt.blend",
            texturePath: "/tmp/composited.png"
          }

          const mockFailResult = {
            success: false,
            error: "Blender not found"
          }

          jest.spyOn(pythonExecutorService, "executeRender").mockResolvedValue(mockFailResult)
          jest.spyOn(fileManagementService, "getTempFilePath").mockResolvedValue("/tmp/renders")

          await expect(
            renderDesignStep.invoke({
              invoke: stepInput,
              container
            })
          ).rejects.toThrow(/3D rendering failed/)
        })

        it("should throw error when no images generated", async () => {
          const stepInput = {
            jobId: testJobId,
            blendFile: "/templates/tshirt.blend",
            texturePath: "/tmp/composited.png"
          }

          const mockEmptyResult = {
            success: true,
            renderedImages: []
          }

          jest.spyOn(pythonExecutorService, "executeRender").mockResolvedValue(mockEmptyResult)
          jest.spyOn(fileManagementService, "getTempFilePath").mockResolvedValue("/tmp/renders")

          await expect(
            renderDesignStep.invoke({
              invoke: stepInput,
              container
            })
          ).rejects.toThrow(/no output images/)
        })

        it("should mark job as failed on compensation", async () => {
          const compensationData = { jobId: testJobId }

          if (renderDesignStep.compensation) {
            await renderDesignStep.compensation(compensationData, { container })
          }

          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.status).toBe("failed")
          expect(job?.error_message).toContain("rendering step")
        })
      })

      describe("Step 5: Store Render Outputs Step", () => {
        let testJobId: string

        beforeEach(async () => {
          const job = await renderJobService.createRenderJob({
            product_id: testProductId,
            design_file_url: "http://test.com/design.png",
            preset: "chest-medium"
          })
          testJobId = job.id
        })

        it("should store all rendered images and animation", async () => {
          const stepInput = {
            jobId: testJobId,
            renderedImages: [
              "/tmp/renders/front.png",
              "/tmp/renders/back.png",
              "/tmp/renders/left.png",
              "/tmp/renders/right.png",
              "/tmp/renders/top.png",
              "/tmp/renders/bottom.png"
            ],
            animation: "/tmp/renders/turntable.mp4"
          }

          const mockImageUrls = stepInput.renderedImages.map((_, i) =>
            `http://sharewear.local:9000/renders/image-${i}.png`
          )

          const mockAnimationUrl = "http://sharewear.local:9000/renders/animation.mp4"

          let callCount = 0
          jest.spyOn(fileManagementService, "storeRenderOutput").mockImplementation(async (path, jobId, type) => {
            if (type === "animation") {
              return { url: mockAnimationUrl, path: "/storage/animation.mp4" }
            }
            return { url: mockImageUrls[callCount++], path: `/storage/image-${callCount}.png` }
          })

          const result = await storeRenderOutputsStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result.output).toHaveProperty("renderedImageUrls")
          expect(result.output.renderedImageUrls).toHaveLength(6)
          expect(result.output).toHaveProperty("animationUrl", mockAnimationUrl)

          // Verify job was updated with URLs
          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.rendered_image_url).toBe(mockImageUrls[0])
          expect(job?.animation_url).toBe(mockAnimationUrl)
        })

        it("should handle missing animation gracefully", async () => {
          const stepInput = {
            jobId: testJobId,
            renderedImages: ["/tmp/renders/front.png"],
            animation: undefined
          }

          jest.spyOn(fileManagementService, "storeRenderOutput").mockResolvedValue({
            url: "http://test.com/image.png",
            path: "/storage/image.png"
          })

          const result = await storeRenderOutputsStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result.output).toHaveProperty("renderedImageUrls")
          expect(result.output).toHaveProperty("animationUrl", undefined)
        })

        it("should mark job as failed on compensation", async () => {
          const compensationData = { jobId: testJobId }

          if (storeRenderOutputsStep.compensation) {
            await storeRenderOutputsStep.compensation(compensationData, { container })
          }

          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.status).toBe("failed")
          expect(job?.error_message).toContain("output storage")
        })
      })

      describe("Step 7: Complete Render Job Step", () => {
        let testJobId: string

        beforeEach(async () => {
          const job = await renderJobService.createRenderJob({
            product_id: testProductId,
            design_file_url: "http://test.com/design.png",
            preset: "chest-medium",
            metadata: {
              workflow_started_at: new Date().toISOString()
            }
          })
          testJobId = job.id

          // Set job to rendering state
          await renderJobService.updateJobStatus(testJobId, "compositing")
          await renderJobService.updateJobStatus(testJobId, "rendering")
        })

        it("should complete job and update metadata", async () => {
          const stepInput = {
            jobId: testJobId,
            mediaIds: ["media_123", "media_456", "media_789"]
          }

          jest.spyOn(fileManagementService, "cleanupJobFiles").mockResolvedValue(undefined)

          const result = await completeRenderJobStep.invoke({
            invoke: stepInput,
            container
          })

          expect(result.output).toHaveProperty("jobId", testJobId)
          expect(result.output).toHaveProperty("status", "completed")

          // Verify job status and metadata
          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.status).toBe("completed")
          expect(job?.completed_at).not.toBeNull()
          expect(job?.metadata).toHaveProperty("media_ids", stepInput.mediaIds)
          expect(job?.metadata).toHaveProperty("workflow_completed_at")
        })

        it("should cleanup temporary files", async () => {
          const stepInput = {
            jobId: testJobId,
            mediaIds: []
          }

          const cleanupSpy = jest.spyOn(fileManagementService, "cleanupJobFiles").mockResolvedValue(undefined)

          await completeRenderJobStep.invoke({
            invoke: stepInput,
            container
          })

          expect(cleanupSpy).toHaveBeenCalledWith(testJobId)
        })

        it("should throw error if job not found", async () => {
          const stepInput = {
            jobId: "invalid_job_id",
            mediaIds: []
          }

          jest.spyOn(fileManagementService, "cleanupJobFiles").mockResolvedValue(undefined)

          await expect(
            completeRenderJobStep.invoke({
              invoke: stepInput,
              container
            })
          ).rejects.toThrow(/not found/)
        })

        it("should preserve existing metadata", async () => {
          const existingMetadata = {
            workflow_started_at: "2024-01-01T00:00:00Z",
            custom_field: "test value"
          }

          await renderJobService.updateRenderJobs({
            id: testJobId,
            metadata: existingMetadata
          })

          const stepInput = {
            jobId: testJobId,
            mediaIds: ["media_123"]
          }

          jest.spyOn(fileManagementService, "cleanupJobFiles").mockResolvedValue(undefined)

          await completeRenderJobStep.invoke({
            invoke: stepInput,
            container
          })

          const job = await renderJobService.getRenderJob(testJobId)
          expect(job?.metadata).toHaveProperty("workflow_started_at", existingMetadata.workflow_started_at)
          expect(job?.metadata).toHaveProperty("custom_field", existingMetadata.custom_field)
          expect(job?.metadata).toHaveProperty("media_ids", ["media_123"])
          expect(job?.metadata).toHaveProperty("workflow_completed_at")
        })
      })
    })
  }
})
