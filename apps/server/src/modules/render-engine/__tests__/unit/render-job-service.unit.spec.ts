import { MedusaError } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import RenderJobService, {
  CreateRenderJobInput,
  RenderJobFilters,
  RenderJobResults,
  UpdateJobStatusInput,
} from "../../services/render-job-service"
import { RenderJobStatus, PresetType } from "../../types"

/**
 * Build a mock logger
 */
const buildMockLogger = (): Logger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  panic: jest.fn(),
  fatal: jest.fn(),
  setLogLevel: jest.fn(),
  unsetLogLevel: jest.fn(),
  shouldLog: jest.fn(),
  activity: jest.fn(),
  progress: jest.fn(),
  failure: jest.fn(),
  success: jest.fn(),
})

/**
 * Create a mock render job entity
 */
const createMockRenderJob = (overrides?: any) => ({
  id: "job-123",
  product_id: "prod-123",
  variant_id: null,
  design_file_url: "https://example.com/design.png",
  preset: "chest-medium" as PresetType,
  template_id: null,
  status: "pending" as RenderJobStatus,
  composited_file_url: null,
  rendered_image_url: null,
  animation_url: null,
  error_message: null,
  started_at: null,
  completed_at: null,
  metadata: null,
  created_at: new Date("2025-01-01T00:00:00Z"),
  updated_at: new Date("2025-01-01T00:00:00Z"),
  ...overrides,
})

describe("RenderJobService", () => {
  let service: RenderJobService
  let mockLogger: Logger

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger = buildMockLogger()

    // Create service instance with mocked logger
    service = new RenderJobService({ logger: mockLogger })

    // Mock the base class methods
    service.createRenderJobs = jest.fn()
    service.updateRenderJobs = jest.fn()
    service.deleteRenderJobs = jest.fn()
    service.listRenderJobs = jest.fn()
    service.listAndCountRenderJobs = jest.fn()
  })

  describe("createRenderJob", () => {
    const validCreateInput: CreateRenderJobInput = {
      product_id: "prod-123",
      variant_id: "var-456",
      design_file_url: "https://example.com/design.png",
      preset: "chest-medium",
      template_id: "tmpl-789",
      metadata: { custom: "data" },
    }

    describe("successful creation", () => {
      it("should create render job with valid inputs", async () => {
        const mockJob = createMockRenderJob()
        ;(service.createRenderJobs as jest.Mock).mockResolvedValue(mockJob)

        const result = await service.createRenderJob(validCreateInput)

        expect(result).toEqual(mockJob)
        expect(service.createRenderJobs).toHaveBeenCalledWith({
          product_id: validCreateInput.product_id,
          variant_id: validCreateInput.variant_id,
          design_file_url: validCreateInput.design_file_url,
          preset: validCreateInput.preset,
          template_id: validCreateInput.template_id,
          status: "pending",
          composited_file_url: null,
          rendered_image_url: null,
          animation_url: null,
          error_message: null,
          started_at: null,
          completed_at: null,
          metadata: validCreateInput.metadata,
        })
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("Created render job")
        )
      })

      it("should create job with minimal required fields", async () => {
        const minimalInput: CreateRenderJobInput = {
          product_id: "prod-123",
          preset: "chest-small",
        }
        const mockJob = createMockRenderJob()
        ;(service.createRenderJobs as jest.Mock).mockResolvedValue(mockJob)

        const result = await service.createRenderJob(minimalInput)

        expect(result).toEqual(mockJob)
        expect(service.createRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            product_id: minimalInput.product_id,
            preset: minimalInput.preset,
            variant_id: null,
            design_file_url: null,
            template_id: null,
            metadata: null,
          })
        )
      })

      it("should accept all valid presets", async () => {
        const validPresets: PresetType[] = [
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

        const mockJob = createMockRenderJob()
        ;(service.createRenderJobs as jest.Mock).mockResolvedValue(mockJob)

        for (const preset of validPresets) {
          const input: CreateRenderJobInput = {
            product_id: "prod-123",
            preset,
          }

          const result = await service.createRenderJob(input)
          expect(result).toEqual(mockJob)
        }

        expect(service.createRenderJobs).toHaveBeenCalledTimes(
          validPresets.length
        )
      })

      it("should handle null optional fields", async () => {
        const input: CreateRenderJobInput = {
          product_id: "prod-123",
          variant_id: null,
          design_file_url: null,
          preset: "chest-medium",
          template_id: null,
          metadata: null,
        }
        const mockJob = createMockRenderJob()
        ;(service.createRenderJobs as jest.Mock).mockResolvedValue(mockJob)

        const result = await service.createRenderJob(input)

        expect(result).toEqual(mockJob)
        expect(service.createRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            variant_id: null,
            design_file_url: null,
            template_id: null,
            metadata: null,
          })
        )
      })
    })

    describe("validation errors", () => {
      it("should throw error for missing product_id", async () => {
        const input = {
          ...validCreateInput,
          product_id: "",
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
        await expect(service.createRenderJob(input)).rejects.toThrow(
          /product_id is required/i
        )
      })

      it("should throw error for whitespace-only product_id", async () => {
        const input = {
          ...validCreateInput,
          product_id: "   ",
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
        await expect(service.createRenderJob(input)).rejects.toThrow(
          /non-empty string/i
        )
      })

      it("should throw error for invalid preset", async () => {
        const input = {
          ...validCreateInput,
          preset: "invalid-preset" as PresetType,
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
        await expect(service.createRenderJob(input)).rejects.toThrow(
          /preset must be one of/i
        )
      })

      it("should throw error for missing preset", async () => {
        const input = {
          product_id: "prod-123",
          preset: undefined as any,
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
        await expect(service.createRenderJob(input)).rejects.toThrow(
          /preset is required/i
        )
      })

      it("should throw error for invalid design_file_url format", async () => {
        const input = {
          ...validCreateInput,
          design_file_url: "not-a-valid-url",
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
        await expect(service.createRenderJob(input)).rejects.toThrow(
          /must be a valid URL/i
        )
      })

      it("should throw error for empty design_file_url", async () => {
        const input = {
          ...validCreateInput,
          design_file_url: "",
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
        await expect(service.createRenderJob(input)).rejects.toThrow(
          /non-empty string when provided/i
        )
      })

      it("should throw error for whitespace-only design_file_url", async () => {
        const input = {
          ...validCreateInput,
          design_file_url: "   ",
        }

        await expect(service.createRenderJob(input)).rejects.toThrow(
          MedusaError
        )
      })

      it("should accept valid URL formats", async () => {
        const validUrls = [
          "https://example.com/design.png",
          "http://localhost:9000/uploads/design.png",
          "https://cdn.example.com/path/to/design.jpg",
          "https://sharewear.local:9000/media/design.png",
        ]

        const mockJob = createMockRenderJob()
        ;(service.createRenderJobs as jest.Mock).mockResolvedValue(mockJob)

        for (const url of validUrls) {
          const input: CreateRenderJobInput = {
            product_id: "prod-123",
            preset: "chest-medium",
            design_file_url: url,
          }

          const result = await service.createRenderJob(input)
          expect(result).toEqual(mockJob)
        }
      })
    })

    describe("metadata handling", () => {
      it("should store metadata correctly", async () => {
        const metadata = {
          custom_field: "value",
          nested: { data: "test" },
          array: [1, 2, 3],
        }
        const input: CreateRenderJobInput = {
          product_id: "prod-123",
          preset: "chest-medium",
          metadata,
        }
        const mockJob = createMockRenderJob({ metadata })
        ;(service.createRenderJobs as jest.Mock).mockResolvedValue(mockJob)

        const result = await service.createRenderJob(input)

        expect(result.metadata).toEqual(metadata)
      })
    })
  })

  describe("getRenderJob", () => {
    it("should return job when found", async () => {
      const mockJob = createMockRenderJob()
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])

      const result = await service.getRenderJob("job-123")

      expect(result).toEqual(mockJob)
      expect(service.listRenderJobs).toHaveBeenCalledWith(
        { id: "job-123" },
        { take: 1 }
      )
    })

    it("should return null when job not found", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

      const result = await service.getRenderJob("non-existent")

      expect(result).toBeNull()
    })

    it("should return null for empty id", async () => {
      const result = await service.getRenderJob("")

      expect(result).toBeNull()
      expect(service.listRenderJobs).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only id", async () => {
      const result = await service.getRenderJob("   ")

      expect(result).toBeNull()
      expect(service.listRenderJobs).not.toHaveBeenCalled()
    })

    it("should return null for non-string id", async () => {
      const result = await service.getRenderJob(null as any)

      expect(result).toBeNull()
      expect(service.listRenderJobs).not.toHaveBeenCalled()
    })
  })

  describe("listRenderJobsWithCount", () => {
    it("should list jobs with default pagination", async () => {
      const mockJobs = [createMockRenderJob(), createMockRenderJob({ id: "job-456" })]
      ;(service.listAndCountRenderJobs as jest.Mock).mockResolvedValue([
        mockJobs,
        2,
      ])

      const result = await service.listRenderJobsWithCount()

      expect(result.jobs).toEqual(mockJobs)
      expect(result.count).toBe(2)
      expect(service.listAndCountRenderJobs).toHaveBeenCalledWith(
        {},
        { take: 50, skip: 0, order: { created_at: "DESC" } }
      )
    })

    it("should filter by product_id", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listAndCountRenderJobs as jest.Mock).mockResolvedValue([
        mockJobs,
        1,
      ])

      const result = await service.listRenderJobsWithCount({
        product_id: "prod-123",
      })

      expect(result.jobs).toEqual(mockJobs)
      expect(service.listAndCountRenderJobs).toHaveBeenCalledWith(
        { product_id: "prod-123" },
        expect.any(Object)
      )
    })

    it("should filter by variant_id", async () => {
      const mockJobs = [createMockRenderJob({ variant_id: "var-456" })]
      ;(service.listAndCountRenderJobs as jest.Mock).mockResolvedValue([
        mockJobs,
        1,
      ])

      const result = await service.listRenderJobsWithCount({
        variant_id: "var-456",
      })

      expect(result.jobs).toEqual(mockJobs)
      expect(service.listAndCountRenderJobs).toHaveBeenCalledWith(
        { variant_id: "var-456" },
        expect.any(Object)
      )
    })

    it("should filter by status", async () => {
      const mockJobs = [createMockRenderJob({ status: "completed" })]
      ;(service.listAndCountRenderJobs as jest.Mock).mockResolvedValue([
        mockJobs,
        1,
      ])

      const result = await service.listRenderJobsWithCount({
        status: "completed",
      })

      expect(result.jobs).toEqual(mockJobs)
      expect(service.listAndCountRenderJobs).toHaveBeenCalledWith(
        { status: "completed" },
        expect.any(Object)
      )
    })

    it("should apply custom pagination", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listAndCountRenderJobs as jest.Mock).mockResolvedValue([
        mockJobs,
        1,
      ])

      await service.listRenderJobsWithCount({
        limit: 10,
        offset: 20,
      })

      expect(service.listAndCountRenderJobs).toHaveBeenCalledWith(
        {},
        { take: 10, skip: 20, order: { created_at: "DESC" } }
      )
    })

    it("should handle multiple filters", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listAndCountRenderJobs as jest.Mock).mockResolvedValue([
        mockJobs,
        1,
      ])

      await service.listRenderJobsWithCount({
        product_id: "prod-123",
        variant_id: "var-456",
        status: "pending",
        limit: 25,
        offset: 10,
      })

      expect(service.listAndCountRenderJobs).toHaveBeenCalledWith(
        {
          product_id: "prod-123",
          variant_id: "var-456",
          status: "pending",
        },
        { take: 25, skip: 10, order: { created_at: "DESC" } }
      )
    })
  })

  describe("getJobsByProduct", () => {
    it("should return jobs for valid product_id", async () => {
      const mockJobs = [createMockRenderJob(), createMockRenderJob({ id: "job-456" })]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      const result = await service.getJobsByProduct("prod-123")

      expect(result).toEqual(mockJobs)
      expect(service.listRenderJobs).toHaveBeenCalledWith(
        { product_id: "prod-123" },
        { order: { created_at: "DESC" } }
      )
    })

    it("should return empty array for empty product_id", async () => {
      const result = await service.getJobsByProduct("")

      expect(result).toEqual([])
      expect(service.listRenderJobs).not.toHaveBeenCalled()
    })

    it("should return empty array for whitespace-only product_id", async () => {
      const result = await service.getJobsByProduct("   ")

      expect(result).toEqual([])
      expect(service.listRenderJobs).not.toHaveBeenCalled()
    })
  })

  describe("getJobsByStatus", () => {
    it("should return jobs with specified status", async () => {
      const mockJobs = [createMockRenderJob({ status: "pending" })]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      const result = await service.getJobsByStatus("pending")

      expect(result).toEqual(mockJobs)
      expect(service.listRenderJobs).toHaveBeenCalledWith(
        { status: "pending" },
        { order: { created_at: "ASC" } }
      )
    })

    it("should work for all status values", async () => {
      const statuses: RenderJobStatus[] = [
        "pending",
        "compositing",
        "rendering",
        "completed",
        "failed",
      ]

      for (const status of statuses) {
        const mockJobs = [createMockRenderJob({ status })]
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

        const result = await service.getJobsByStatus(status)

        expect(result).toEqual(mockJobs)
      }
    })
  })

  describe("getActiveJobs", () => {
    it("should return jobs with active statuses", async () => {
      const mockJobs = [
        createMockRenderJob({ status: "pending" }),
        createMockRenderJob({ status: "compositing" }),
        createMockRenderJob({ status: "rendering" }),
      ]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      const result = await service.getActiveJobs()

      expect(result).toEqual(mockJobs)
      expect(service.listRenderJobs).toHaveBeenCalledWith(
        { status: ["pending", "compositing", "rendering"] },
        { order: { created_at: "ASC" } }
      )
    })
  })

  describe("updateJobStatus", () => {
    describe("valid status transitions", () => {
      it("should update status from pending to compositing", async () => {
        const mockJob = createMockRenderJob({ status: "pending" })
        const updatedJob = createMockRenderJob({
          status: "compositing",
          started_at: new Date(),
        })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "compositing")

        expect(result.status).toBe("compositing")
        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "job-123",
            status: "compositing",
            started_at: expect.any(Date),
          })
        )
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("pending to compositing")
        )
      })

      it("should update status from compositing to rendering", async () => {
        const mockJob = createMockRenderJob({ status: "compositing" })
        const updatedJob = createMockRenderJob({ status: "rendering" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "rendering")

        expect(result.status).toBe("rendering")
        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "rendering",
          })
        )
      })

      it("should update status from rendering to completed", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({
          status: "completed",
          completed_at: new Date(),
        })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "completed")

        expect(result.status).toBe("completed")
        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "completed",
            completed_at: expect.any(Date),
          })
        )
      })

      it("should update status from pending to failed", async () => {
        const mockJob = createMockRenderJob({ status: "pending" })
        const updatedJob = createMockRenderJob({
          status: "failed",
          completed_at: new Date(),
        })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "failed")

        expect(result.status).toBe("failed")
        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "failed",
            completed_at: expect.any(Date),
          })
        )
      })

      it("should update status from compositing to failed", async () => {
        const mockJob = createMockRenderJob({ status: "compositing" })
        const updatedJob = createMockRenderJob({ status: "failed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "failed")

        expect(result.status).toBe("failed")
      })

      it("should update status from rendering to failed", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "failed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "failed")

        expect(result.status).toBe("failed")
      })

      it("should allow staying in same status (idempotent)", async () => {
        const mockJob = createMockRenderJob({ status: "pending" })
        const updatedJob = createMockRenderJob({ status: "pending" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        const result = await service.updateJobStatus("job-123", "pending")

        expect(result.status).toBe("pending")
      })
    })

    describe("invalid status transitions", () => {
      it("should throw error for completed to pending", async () => {
        const mockJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])

        await expect(
          service.updateJobStatus("job-123", "pending")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.updateJobStatus("job-123", "pending")
        ).rejects.toThrow(/Invalid status transition/)
        await expect(
          service.updateJobStatus("job-123", "pending")
        ).rejects.toThrow(/terminal state/)
      })

      it("should throw error for failed to pending", async () => {
        const mockJob = createMockRenderJob({ status: "failed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])

        await expect(
          service.updateJobStatus("job-123", "pending")
        ).rejects.toThrow(MedusaError)
      })

      it("should throw error for pending to rendering (skipping compositing)", async () => {
        const mockJob = createMockRenderJob({ status: "pending" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])

        await expect(
          service.updateJobStatus("job-123", "rendering")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.updateJobStatus("job-123", "rendering")
        ).rejects.toThrow(/cannot change from 'pending' to 'rendering'/)
      })

      it("should throw error for compositing to completed (skipping rendering)", async () => {
        const mockJob = createMockRenderJob({ status: "compositing" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])

        await expect(
          service.updateJobStatus("job-123", "completed")
        ).rejects.toThrow(MedusaError)
      })

      it("should throw error for completed to rendering", async () => {
        const mockJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])

        await expect(
          service.updateJobStatus("job-123", "rendering")
        ).rejects.toThrow(MedusaError)
      })
    })

    describe("automatic timestamp updates", () => {
      it("should set started_at when transitioning to compositing", async () => {
        const mockJob = createMockRenderJob({ status: "pending" })
        const updatedJob = createMockRenderJob({
          status: "compositing",
          started_at: new Date(),
        })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "compositing")

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            started_at: expect.any(Date),
          })
        )
      })

      it("should not override existing started_at", async () => {
        const existingDate = new Date("2025-01-01T12:00:00Z")
        const mockJob = createMockRenderJob({
          status: "pending",
          started_at: existingDate,
        })
        const updatedJob = createMockRenderJob({ status: "compositing" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "compositing")

        const callArgs = (service.updateRenderJobs as jest.Mock).mock.calls[0][0]
        expect(callArgs.started_at).toBeUndefined()
      })

      it("should set completed_at when transitioning to completed", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed")

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            completed_at: expect.any(Date),
          })
        )
      })

      it("should set completed_at when transitioning to failed", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "failed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "failed")

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            completed_at: expect.any(Date),
          })
        )
      })

      it("should not override existing completed_at", async () => {
        const existingDate = new Date("2025-01-01T12:00:00Z")
        const mockJob = createMockRenderJob({
          status: "rendering",
          completed_at: existingDate,
        })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed")

        const callArgs = (service.updateRenderJobs as jest.Mock).mock.calls[0][0]
        expect(callArgs.completed_at).toBeUndefined()
      })
    })

    describe("manual timestamp overrides", () => {
      it("should allow manual started_at override", async () => {
        const manualDate = new Date("2025-01-15T10:00:00Z")
        const mockJob = createMockRenderJob({ status: "pending" })
        const updatedJob = createMockRenderJob({ status: "compositing" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "compositing", {
          started_at: manualDate,
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            started_at: manualDate,
          })
        )
      })

      it("should allow manual completed_at override", async () => {
        const manualDate = new Date("2025-01-15T10:00:00Z")
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed", {
          completed_at: manualDate,
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            completed_at: manualDate,
          })
        )
      })

      it("should allow setting timestamps to null", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed", {
          started_at: null,
          completed_at: null,
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            started_at: null,
            completed_at: null,
          })
        )
      })
    })

    describe("additional data updates", () => {
      it("should update composited_file_url", async () => {
        const mockJob = createMockRenderJob({ status: "pending" })
        const updatedJob = createMockRenderJob({ status: "compositing" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "compositing", {
          composited_file_url: "https://example.com/composite.png",
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            composited_file_url: "https://example.com/composite.png",
          })
        )
      })

      it("should update rendered_image_url", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed", {
          rendered_image_url: "https://example.com/rendered.png",
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            rendered_image_url: "https://example.com/rendered.png",
          })
        )
      })

      it("should update animation_url", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed", {
          animation_url: "https://example.com/animation.mp4",
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            animation_url: "https://example.com/animation.mp4",
          })
        )
      })

      it("should update error_message", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "failed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "failed", {
          error_message: "Blender render failed",
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            error_message: "Blender render failed",
          })
        )
      })

      it("should update multiple fields at once", async () => {
        const mockJob = createMockRenderJob({ status: "rendering" })
        const updatedJob = createMockRenderJob({ status: "completed" })
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
        ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

        await service.updateJobStatus("job-123", "completed", {
          rendered_image_url: "https://example.com/rendered.png",
          animation_url: "https://example.com/animation.mp4",
          completed_at: new Date(),
        })

        expect(service.updateRenderJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            rendered_image_url: "https://example.com/rendered.png",
            animation_url: "https://example.com/animation.mp4",
            completed_at: expect.any(Date),
          })
        )
      })
    })

    describe("error cases", () => {
      it("should throw error if job not found", async () => {
        ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

        await expect(
          service.updateJobStatus("non-existent", "compositing")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.updateJobStatus("non-existent", "compositing")
        ).rejects.toThrow(/not found/)
      })
    })
  })

  describe("updateJobResults", () => {
    it("should update composited_file_url", async () => {
      const mockJob = createMockRenderJob()
      const updatedJob = createMockRenderJob({
        composited_file_url: "https://example.com/composite.png",
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
      ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

      const result = await service.updateJobResults("job-123", {
        composited_file_url: "https://example.com/composite.png",
      })

      expect(result.composited_file_url).toBe(
        "https://example.com/composite.png"
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Updated render job")
      )
    })

    it("should update rendered_image_url", async () => {
      const mockJob = createMockRenderJob()
      const updatedJob = createMockRenderJob({
        rendered_image_url: "https://example.com/rendered.png",
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
      ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

      const result = await service.updateJobResults("job-123", {
        rendered_image_url: "https://example.com/rendered.png",
      })

      expect(result.rendered_image_url).toBe("https://example.com/rendered.png")
    })

    it("should update animation_url", async () => {
      const mockJob = createMockRenderJob()
      const updatedJob = createMockRenderJob({
        animation_url: "https://example.com/animation.mp4",
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
      ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

      const result = await service.updateJobResults("job-123", {
        animation_url: "https://example.com/animation.mp4",
      })

      expect(result.animation_url).toBe("https://example.com/animation.mp4")
    })

    it("should update multiple URLs at once", async () => {
      const mockJob = createMockRenderJob()
      const updatedJob = createMockRenderJob({
        composited_file_url: "https://example.com/composite.png",
        rendered_image_url: "https://example.com/rendered.png",
        animation_url: "https://example.com/animation.mp4",
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
      ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

      const result = await service.updateJobResults("job-123", {
        composited_file_url: "https://example.com/composite.png",
        rendered_image_url: "https://example.com/rendered.png",
        animation_url: "https://example.com/animation.mp4",
      })

      expect(result.composited_file_url).toBe(
        "https://example.com/composite.png"
      )
      expect(result.rendered_image_url).toBe("https://example.com/rendered.png")
      expect(result.animation_url).toBe("https://example.com/animation.mp4")
    })

    it("should set URLs to null", async () => {
      const mockJob = createMockRenderJob()
      const updatedJob = createMockRenderJob({
        composited_file_url: null,
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
      ;(service.updateRenderJobs as jest.Mock).mockResolvedValue(updatedJob)

      const result = await service.updateJobResults("job-123", {
        composited_file_url: null,
      })

      expect(result.composited_file_url).toBeNull()
    })

    it("should throw error if job not found", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

      await expect(
        service.updateJobResults("non-existent", {
          composited_file_url: "https://example.com/composite.png",
        })
      ).rejects.toThrow(MedusaError)
      await expect(
        service.updateJobResults("non-existent", {
          composited_file_url: "https://example.com/composite.png",
        })
      ).rejects.toThrow(/not found/)
    })
  })

  describe("getProductRenderStats", () => {
    it("should calculate stats correctly", async () => {
      const mockJobs = [
        createMockRenderJob({ status: "completed" }),
        createMockRenderJob({ status: "completed", id: "job-2" }),
        createMockRenderJob({ status: "failed", id: "job-3" }),
        createMockRenderJob({ status: "pending", id: "job-4" }),
        createMockRenderJob({ status: "compositing", id: "job-5" }),
        createMockRenderJob({ status: "rendering", id: "job-6" }),
      ]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      const result = await service.getProductRenderStats("prod-123")

      expect(result).toEqual({
        total: 6,
        completed: 2,
        failed: 1,
        pending: 1,
        compositing: 1,
        rendering: 1,
      })
    })

    it("should return zero stats for product with no jobs", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

      const result = await service.getProductRenderStats("prod-123")

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        compositing: 0,
        rendering: 0,
      })
    })

    it("should throw error for empty product_id", async () => {
      await expect(service.getProductRenderStats("")).rejects.toThrow(
        MedusaError
      )
      await expect(service.getProductRenderStats("")).rejects.toThrow(
        /product_id is required/i
      )
    })

    it("should throw error for whitespace-only product_id", async () => {
      await expect(service.getProductRenderStats("   ")).rejects.toThrow(
        MedusaError
      )
    })
  })

  describe("getRecentRenderJobs", () => {
    it("should return jobs from last 24 hours by default", async () => {
      const now = new Date("2025-01-15T12:00:00Z")
      const recentJob = createMockRenderJob({
        created_at: new Date("2025-01-15T10:00:00Z"),
      })
      const oldJob = createMockRenderJob({
        id: "job-old",
        created_at: new Date("2025-01-14T10:00:00Z"),
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([
        recentJob,
        oldJob,
      ])

      jest.useFakeTimers()
      jest.setSystemTime(now)

      const result = await service.getRecentRenderJobs()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("job-123")

      jest.useRealTimers()
    })

    it("should filter by custom hour range", async () => {
      const now = new Date("2025-01-15T12:00:00Z")
      const recentJob = createMockRenderJob({
        created_at: new Date("2025-01-15T11:00:00Z"),
      })
      const oldJob = createMockRenderJob({
        id: "job-old",
        created_at: new Date("2025-01-15T09:00:00Z"),
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([
        recentJob,
        oldJob,
      ])

      jest.useFakeTimers()
      jest.setSystemTime(now)

      const result = await service.getRecentRenderJobs(2)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("job-123")

      jest.useRealTimers()
    })

    it("should apply custom limit", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      await service.getRecentRenderJobs(24, 10)

      expect(service.listRenderJobs).toHaveBeenCalledWith(
        {},
        { take: 10, order: { created_at: "DESC" } }
      )
    })

    it("should throw error for invalid hours", async () => {
      await expect(service.getRecentRenderJobs(0)).rejects.toThrow(MedusaError)
      await expect(service.getRecentRenderJobs(-1)).rejects.toThrow(
        /must be greater than 0/i
      )
    })
  })

  describe("hasActiveRenders", () => {
    it("should return true when product has active jobs", async () => {
      const mockJobs = [createMockRenderJob({ status: "pending" })]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      const result = await service.hasActiveRenders("prod-123")

      expect(result).toBe(true)
      expect(service.listRenderJobs).toHaveBeenCalledWith(
        {
          product_id: "prod-123",
          status: ["pending", "compositing", "rendering"],
        },
        { take: 1 }
      )
    })

    it("should return false when product has no active jobs", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

      const result = await service.hasActiveRenders("prod-123")

      expect(result).toBe(false)
    })

    it("should return false for empty product_id", async () => {
      const result = await service.hasActiveRenders("")

      expect(result).toBe(false)
      expect(service.listRenderJobs).not.toHaveBeenCalled()
    })
  })

  describe("listRenderJobsByProduct", () => {
    it("should list jobs with default options", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      const result = await service.listRenderJobsByProduct("prod-123")

      expect(result).toEqual(mockJobs)
      expect(service.listRenderJobs).toHaveBeenCalledWith(
        { product_id: "prod-123" },
        { take: 50, skip: 0, order: { created_at: "DESC" } }
      )
    })

    it("should apply status filter", async () => {
      const mockJobs = [createMockRenderJob({ status: "completed" })]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      await service.listRenderJobsByProduct("prod-123", {
        status: "completed",
      })

      expect(service.listRenderJobs).toHaveBeenCalledWith(
        { product_id: "prod-123", status: "completed" },
        expect.any(Object)
      )
    })

    it("should apply custom pagination", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      await service.listRenderJobsByProduct("prod-123", {
        limit: 10,
        offset: 20,
      })

      expect(service.listRenderJobs).toHaveBeenCalledWith(
        expect.any(Object),
        { take: 10, skip: 20, order: { created_at: "DESC" } }
      )
    })

    it("should apply custom order", async () => {
      const mockJobs = [createMockRenderJob()]
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue(mockJobs)

      await service.listRenderJobsByProduct("prod-123", {
        order: "ASC",
      })

      expect(service.listRenderJobs).toHaveBeenCalledWith(
        expect.any(Object),
        { take: 50, skip: 0, order: { created_at: "ASC" } }
      )
    })

    it("should throw error for empty product_id", async () => {
      await expect(service.listRenderJobsByProduct("")).rejects.toThrow(
        MedusaError
      )
      await expect(service.listRenderJobsByProduct("")).rejects.toThrow(
        /product_id is required/i
      )
    })
  })

  describe("deleteRenderJob", () => {
    it("should delete existing job", async () => {
      const mockJob = createMockRenderJob()
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([mockJob])
      ;(service.deleteRenderJobs as jest.Mock).mockResolvedValue(undefined)

      await service.deleteRenderJob("job-123")

      expect(service.deleteRenderJobs).toHaveBeenCalledWith("job-123")
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Deleted render job")
      )
    })

    it("should throw error for non-existent job", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

      await expect(service.deleteRenderJob("non-existent")).rejects.toThrow(
        MedusaError
      )
      await expect(service.deleteRenderJob("non-existent")).rejects.toThrow(
        /not found/i
      )
      expect(service.deleteRenderJobs).not.toHaveBeenCalled()
    })

    it("should throw error for empty id", async () => {
      await expect(service.deleteRenderJob("")).rejects.toThrow(MedusaError)
      await expect(service.deleteRenderJob("")).rejects.toThrow(
        /ID is required/i
      )
    })

    it("should throw error for whitespace-only id", async () => {
      await expect(service.deleteRenderJob("   ")).rejects.toThrow(MedusaError)
    })
  })

  describe("cleanupOldJobs", () => {
    it("should delete old failed jobs", async () => {
      const now = new Date("2025-01-15T12:00:00Z")
      const oldJob = createMockRenderJob({
        status: "failed",
        completed_at: new Date("2025-01-01T12:00:00Z"),
      })
      const recentJob = createMockRenderJob({
        id: "job-recent",
        status: "failed",
        completed_at: new Date("2025-01-14T12:00:00Z"),
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([
        oldJob,
        recentJob,
      ])
      ;(service.deleteRenderJobs as jest.Mock).mockResolvedValue(undefined)

      jest.useFakeTimers()
      jest.setSystemTime(now)

      const result = await service.cleanupOldJobs(7)

      expect(result).toBe(1)
      expect(service.deleteRenderJobs).toHaveBeenCalledTimes(1)
      expect(service.deleteRenderJobs).toHaveBeenCalledWith("job-123")
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Cleaned up 1 failed render jobs")
      )

      jest.useRealTimers()
    })

    it("should return 0 when no old jobs exist", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])
      ;(service.deleteRenderJobs as jest.Mock).mockResolvedValue(undefined)

      const result = await service.cleanupOldJobs(30)

      expect(result).toBe(0)
      expect(service.deleteRenderJobs).not.toHaveBeenCalled()
    })

    it("should throw error for invalid days", async () => {
      await expect(service.cleanupOldJobs(0)).rejects.toThrow(MedusaError)
      await expect(service.cleanupOldJobs(-1)).rejects.toThrow(
        /must be greater than 0/i
      )
    })

    it("should only delete jobs with completed_at set", async () => {
      const now = new Date("2025-01-15T12:00:00Z")
      const oldJobWithoutCompletedAt = createMockRenderJob({
        status: "failed",
        completed_at: null,
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([
        oldJobWithoutCompletedAt,
      ])
      ;(service.deleteRenderJobs as jest.Mock).mockResolvedValue(undefined)

      jest.useFakeTimers()
      jest.setSystemTime(now)

      const result = await service.cleanupOldJobs(7)

      expect(result).toBe(0)
      expect(service.deleteRenderJobs).not.toHaveBeenCalled()

      jest.useRealTimers()
    })
  })

  describe("retryRenderJob", () => {
    it("should create new job from failed job", async () => {
      const failedJob = createMockRenderJob({
        status: "failed",
        metadata: { attempt: 1 },
      })
      const newJob = createMockRenderJob({
        id: "job-new",
        metadata: { retried_from: "job-123", retry_count: 1, attempt: 1 },
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([failedJob])
      ;(service.createRenderJobs as jest.Mock).mockResolvedValue(newJob)

      const result = await service.retryRenderJob("job-123")

      expect(result.id).toBe("job-new")
      expect(service.createRenderJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: failedJob.product_id,
          variant_id: failedJob.variant_id,
          design_file_url: failedJob.design_file_url,
          preset: failedJob.preset,
          template_id: failedJob.template_id,
          status: "pending",
          metadata: {
            attempt: 1,
            retried_from: "job-123",
            retry_count: 1,
          },
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Created retry job")
      )
    })

    it("should increment retry_count", async () => {
      const failedJob = createMockRenderJob({
        status: "failed",
        metadata: { retry_count: 2 },
      })
      const newJob = createMockRenderJob({
        id: "job-new",
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([failedJob])
      ;(service.createRenderJobs as jest.Mock).mockResolvedValue(newJob)

      await service.retryRenderJob("job-123")

      expect(service.createRenderJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            retry_count: 3,
            retried_from: "job-123",
          },
        })
      )
    })

    it("should initialize retry_count to 1 if not present", async () => {
      const failedJob = createMockRenderJob({
        status: "failed",
        metadata: null,
      })
      const newJob = createMockRenderJob({
        id: "job-new",
      })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([failedJob])
      ;(service.createRenderJobs as jest.Mock).mockResolvedValue(newJob)

      await service.retryRenderJob("job-123")

      expect(service.createRenderJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            retried_from: "job-123",
            retry_count: 1,
          },
        })
      )
    })

    it("should throw error if job not found", async () => {
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([])

      await expect(service.retryRenderJob("non-existent")).rejects.toThrow(
        MedusaError
      )
      await expect(service.retryRenderJob("non-existent")).rejects.toThrow(
        /not found/i
      )
    })

    it("should throw error if job not failed", async () => {
      const pendingJob = createMockRenderJob({ status: "pending" })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([pendingJob])

      await expect(service.retryRenderJob("job-123")).rejects.toThrow(
        MedusaError
      )
      await expect(service.retryRenderJob("job-123")).rejects.toThrow(
        /must be 'failed'/i
      )
      expect(service.createRenderJobs).not.toHaveBeenCalled()
    })

    it("should not retry completed jobs", async () => {
      const completedJob = createMockRenderJob({ status: "completed" })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([completedJob])

      await expect(service.retryRenderJob("job-123")).rejects.toThrow(
        MedusaError
      )
      await expect(service.retryRenderJob("job-123")).rejects.toThrow(
        /must be 'failed'/i
      )
    })

    it("should not retry compositing jobs", async () => {
      const compositingJob = createMockRenderJob({ status: "compositing" })
      ;(service.listRenderJobs as jest.Mock).mockResolvedValue([compositingJob])

      await expect(service.retryRenderJob("job-123")).rejects.toThrow(
        MedusaError
      )
    })
  })
})
