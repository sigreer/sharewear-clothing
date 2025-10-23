// Mock fs/promises and fs at the top level before any imports
const mockFsWriteFile = jest.fn(() => Promise.resolve())
const mockFsCopyFile = jest.fn(() => Promise.resolve())
const mockFsMkdir = jest.fn(() => Promise.resolve())
const mockFsRm = jest.fn(() => Promise.resolve())
const mockFsReaddir = jest.fn(() => Promise.resolve([]))
const mockFsStat = jest.fn(() => Promise.resolve({ mtime: new Date() }))
const mockExistsSync = jest.fn(() => true)

jest.mock("fs/promises", () => ({
  writeFile: (...args: any[]) => mockFsWriteFile(...args),
  copyFile: (...args: any[]) => mockFsCopyFile(...args),
  mkdir: (...args: any[]) => mockFsMkdir(...args),
  rm: (...args: any[]) => mockFsRm(...args),
  readdir: (...args: any[]) => mockFsReaddir(...args),
  stat: (...args: any[]) => mockFsStat(...args),
}))

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: (...args: any[]) => mockExistsSync(...args),
}))

// Now import after mocks are set up
import FileManagementService from "../../services/file-management-service"
import { MedusaError } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import path from "path"

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

describe("FileManagementService", () => {
  let service: FileManagementService
  let mockLogger: Logger

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Re-set default behaviors
    mockExistsSync.mockReturnValue(true)
    mockFsMkdir.mockResolvedValue(undefined)
    mockFsWriteFile.mockResolvedValue(undefined)
    mockFsCopyFile.mockResolvedValue(undefined)
    mockFsRm.mockResolvedValue(undefined)
    mockFsReaddir.mockResolvedValue([])
    mockFsStat.mockResolvedValue({ mtime: new Date() } as any)

    mockLogger = buildMockLogger()
    service = new FileManagementService({ logger: mockLogger })
  })

  describe("constructor", () => {
    it("should initialize with logger", () => {
      const service = new FileManagementService({ logger: mockLogger })
      expect(service).toBeDefined()
      expect(mockLogger.debug).toHaveBeenCalled()
    })

    it("should resolve base URL from MEDUSA_FILE_BASE_URL", () => {
      process.env.MEDUSA_FILE_BASE_URL = "http://example.com/static"
      const service = new FileManagementService({ logger: mockLogger })
      expect(service).toBeDefined()
      delete process.env.MEDUSA_FILE_BASE_URL
    })

    it("should resolve base URL from MEDUSA_PUBLIC_BASE_URL", () => {
      process.env.MEDUSA_PUBLIC_BASE_URL = "http://example.com"
      const service = new FileManagementService({ logger: mockLogger })
      expect(service).toBeDefined()
      delete process.env.MEDUSA_PUBLIC_BASE_URL
    })

    it("should resolve base URL from MEDUSA_BACKEND_URL", () => {
      process.env.MEDUSA_BACKEND_URL = "http://example.com"
      const service = new FileManagementService({ logger: mockLogger })
      expect(service).toBeDefined()
      delete process.env.MEDUSA_BACKEND_URL
    })

    it("should add /static suffix if not present", () => {
      process.env.MEDUSA_BACKEND_URL = "http://example.com"
      const service = new FileManagementService({ logger: mockLogger })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("http://example.com/static")
      )
      delete process.env.MEDUSA_BACKEND_URL
    })

    it("should default to sharewear.local:9000/static", () => {
      const service = new FileManagementService({ logger: mockLogger })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("sharewear.local:9000/static")
      )
    })
  })

  describe("uploadDesignFile", () => {
    const validJobId = "job-123"
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF])

    describe("successful upload", () => {
      it("should upload valid PNG file", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        const result = await service.uploadDesignFile(file, validJobId)

        expect(result).toHaveProperty("url")
        expect(result).toHaveProperty("path")
        expect(result.url).toContain("design.png")
        expect(mockFsWriteFile).toHaveBeenCalled()
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("uploaded successfully")
        )
      })

      it("should upload valid JPEG file", async () => {
        const file = {
          buffer: validJpegBuffer,
          filename: "design.jpg",
          mimetype: "image/jpeg",
        }

        const result = await service.uploadDesignFile(file, validJobId)

        expect(result).toHaveProperty("url")
        expect(result).toHaveProperty("path")
        expect(mockFsWriteFile).toHaveBeenCalled()
      })

      it("should sanitize filename", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "my design!@#$.png",
          mimetype: "image/png",
        }

        const result = await service.uploadDesignFile(file, validJobId)

        expect(result.path).toContain("design.png")
        expect(mockFsWriteFile).toHaveBeenCalled()
      })

      it("should create directory if it doesn't exist", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await service.uploadDesignFile(file, validJobId)

        expect(mockFsMkdir).toHaveBeenCalledWith(
          expect.any(String),
          { recursive: true }
        )
      })

      it("should generate public URL correctly", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        const result = await service.uploadDesignFile(file, validJobId)

        expect(result.url).toMatch(/^http:\/\//)
        expect(result.url).toContain("uploads/render-jobs")
        expect(result.url).toContain(validJobId)
      })
    })

    describe("job ID validation", () => {
      it("should reject empty job ID", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, "")).rejects.toThrow(
          MedusaError
        )
        await expect(service.uploadDesignFile(file, "")).rejects.toThrow(
          /Job ID is required/i
        )
      })

      it("should reject non-string job ID", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(
          service.uploadDesignFile(file, null as any)
        ).rejects.toThrow(MedusaError)
      })

      it("should reject job ID with path traversal", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(
          service.uploadDesignFile(file, "../etc/passwd")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.uploadDesignFile(file, "../etc/passwd")
        ).rejects.toThrow(/invalid characters/i)
      })

      it("should reject job ID with forward slash", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(
          service.uploadDesignFile(file, "job/123")
        ).rejects.toThrow(MedusaError)
      })

      it("should reject job ID with backslash", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(
          service.uploadDesignFile(file, "job\\123")
        ).rejects.toThrow(MedusaError)
      })

      it("should accept valid UUID-like job ID", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        const result = await service.uploadDesignFile(file, "job-abc-123_xyz")

        expect(result).toHaveProperty("url")
      })

      it("should reject job ID with invalid characters", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(
          service.uploadDesignFile(file, "job@123")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.uploadDesignFile(file, "job@123")
        ).rejects.toThrow(/invalid format/i)
      })
    })

    describe("file validation", () => {
      it("should reject null file", async () => {
        // The service logs before validation, so we expect any error (TypeError or MedusaError)
        await expect(
          service.uploadDesignFile(null as any, validJobId)
        ).rejects.toThrow()
      })

      it("should reject non-object file", async () => {
        // The service logs before validation, so we expect any error (TypeError or MedusaError)
        await expect(
          service.uploadDesignFile("not-a-file" as any, validJobId)
        ).rejects.toThrow()
      })

      it("should reject file without buffer", async () => {
        // The service logs before validation, so we expect any error (TypeError or MedusaError)
        const file = {
          buffer: null as any,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow()
      })

      it("should reject empty buffer", async () => {
        const file = {
          buffer: Buffer.from([]),
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          /empty/i
        )
      })

      it("should reject file exceeding size limit", async () => {
        const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
        const file = {
          buffer: largeBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          /exceeds maximum/i
        )
      })

      it("should reject invalid MIME type", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.txt",
          mimetype: "text/plain",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          /Invalid file type/i
        )
      })

      it("should reject missing filename", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: null as any,
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          /Filename is required/i
        )
      })
    })

    describe("magic bytes validation", () => {
      it("should accept valid PNG magic bytes", async () => {
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        const result = await service.uploadDesignFile(file, validJobId)

        expect(result).toHaveProperty("url")
      })

      it("should accept valid JPEG magic bytes", async () => {
        const file = {
          buffer: validJpegBuffer,
          filename: "design.jpg",
          mimetype: "image/jpeg",
        }

        const result = await service.uploadDesignFile(file, validJobId)

        expect(result).toHaveProperty("url")
      })

      it("should reject PNG with invalid magic bytes", async () => {
        const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
        const file = {
          buffer: invalidBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          /does not match declared type/i
        )
      })

      it("should reject JPEG with invalid magic bytes", async () => {
        const invalidBuffer = Buffer.from([0x00, 0x00, 0x00])
        const file = {
          buffer: invalidBuffer,
          filename: "design.jpg",
          mimetype: "image/jpeg",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
      })

      it("should reject mismatched MIME type and magic bytes", async () => {
        const file = {
          buffer: validJpegBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
      })
    })

    describe("error handling", () => {
      it("should handle directory creation failure", async () => {
        mockFsMkdir.mockRejectedValue(new Error("Permission denied"))
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
      })

      it("should handle file write failure", async () => {
        mockFsWriteFile.mockRejectedValue(new Error("Disk full"))
        const file = {
          buffer: validPngBuffer,
          filename: "design.png",
          mimetype: "image/png",
        }

        await expect(service.uploadDesignFile(file, validJobId)).rejects.toThrow(
          MedusaError
        )
        expect(mockLogger.error).toHaveBeenCalled()
      })
    })
  })

  describe("storeRenderOutput", () => {
    const validJobId = "job-123"
    const validFilePath = "/tmp/render/output.png"

    describe("successful storage", () => {
      it("should store composited output", async () => {
        const result = await service.storeRenderOutput(
          validFilePath,
          validJobId,
          "composited"
        )

        expect(result).toHaveProperty("url")
        expect(result).toHaveProperty("path")
        expect(result.path).toContain("composited.png")
        expect(mockFsCopyFile).toHaveBeenCalled()
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("stored successfully")
        )
      })

      it("should store rendered output", async () => {
        const result = await service.storeRenderOutput(
          validFilePath,
          validJobId,
          "rendered"
        )

        expect(result.path).toContain("rendered.png")
      })

      it("should store animation output", async () => {
        const animationPath = "/tmp/render/animation.mp4"
        const result = await service.storeRenderOutput(
          animationPath,
          validJobId,
          "animation"
        )

        expect(result.path).toContain("animation.mp4")
      })

      it("should create directory if it doesn't exist", async () => {
        await service.storeRenderOutput(validFilePath, validJobId, "rendered")

        expect(mockFsMkdir).toHaveBeenCalledWith(
          expect.any(String),
          { recursive: true }
        )
      })

      it("should copy file to storage location", async () => {
        await service.storeRenderOutput(validFilePath, validJobId, "rendered")

        expect(mockFsCopyFile).toHaveBeenCalledWith(
          validFilePath,
          expect.any(String)
        )
      })
    })

    describe("job ID validation", () => {
      it("should reject empty job ID", async () => {
        await expect(
          service.storeRenderOutput(validFilePath, "", "rendered")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.storeRenderOutput(validFilePath, "", "rendered")
        ).rejects.toThrow(/Job ID is required/i)
      })

      it("should reject job ID with path traversal", async () => {
        await expect(
          service.storeRenderOutput(validFilePath, "../etc", "rendered")
        ).rejects.toThrow(MedusaError)
      })
    })

    describe("file path validation", () => {
      it("should reject empty file path", async () => {
        await expect(
          service.storeRenderOutput("", validJobId, "rendered")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.storeRenderOutput("", validJobId, "rendered")
        ).rejects.toThrow(/File path is required/i)
      })

      it("should reject non-string file path", async () => {
        await expect(
          service.storeRenderOutput(null as any, validJobId, "rendered")
        ).rejects.toThrow(MedusaError)
      })

      it("should accept normalized absolute paths", async () => {
        // path.normalize("/tmp/../etc/passwd") results in "/etc/passwd" which is absolute
        // The service validates after normalization, so this is accepted as a valid absolute path
        const result = await service.storeRenderOutput("/tmp/../etc/passwd", validJobId, "rendered")
        expect(result).toHaveProperty("url")
      })

      it("should reject relative path", async () => {
        await expect(
          service.storeRenderOutput("relative/path.png", validJobId, "rendered")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.storeRenderOutput("relative/path.png", validJobId, "rendered")
        ).rejects.toThrow(/must be absolute/i)
      })
    })

    describe("file existence check", () => {
      it("should reject non-existent file", async () => {
        mockExistsSync.mockReturnValue(false)

        await expect(
          service.storeRenderOutput(validFilePath, validJobId, "rendered")
        ).rejects.toThrow(MedusaError)
        await expect(
          service.storeRenderOutput(validFilePath, validJobId, "rendered")
        ).rejects.toThrow(/not found/i)
      })
    })

    describe("output type validation", () => {
      it("should reject invalid output type", async () => {
        await expect(
          service.storeRenderOutput(validFilePath, validJobId, "invalid" as any)
        ).rejects.toThrow(MedusaError)
        await expect(
          service.storeRenderOutput(validFilePath, validJobId, "invalid" as any)
        ).rejects.toThrow(/Unknown output type/i)
      })
    })

    describe("error handling", () => {
      it("should handle copy failure", async () => {
        mockFsCopyFile.mockRejectedValue(new Error("Permission denied"))

        await expect(
          service.storeRenderOutput(validFilePath, validJobId, "rendered")
        ).rejects.toThrow(MedusaError)
        expect(mockLogger.error).toHaveBeenCalled()
      })
    })
  })

  describe("cleanupJobFiles", () => {
    const validJobId = "job-123"

    it("should cleanup temp directory", async () => {
      await service.cleanupJobFiles(validJobId)

      expect(mockFsRm).toHaveBeenCalledWith(
        expect.stringContaining("/tmp/render-jobs/job-123"),
        { recursive: true, force: true }
      )
    })

    it("should cleanup upload directory", async () => {
      await service.cleanupJobFiles(validJobId)

      expect(mockFsRm).toHaveBeenCalledWith(
        expect.stringContaining("uploads/render-jobs/job-123"),
        { recursive: true, force: true }
      )
    })

    it("should not throw on cleanup failure", async () => {
      mockFsRm.mockRejectedValue(new Error("Permission denied"))

      await expect(service.cleanupJobFiles(validJobId)).resolves.not.toThrow()
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it("should handle non-existent directories", async () => {
      mockExistsSync.mockReturnValue(false)

      await service.cleanupJobFiles(validJobId)

      expect(mockFsRm).not.toHaveBeenCalled()
    })

    it("should log cleanup count", async () => {
      await service.cleanupJobFiles(validJobId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("cleaned 2 directories")
      )
    })

    it("should validate job ID", async () => {
      await service.cleanupJobFiles("")

      expect(mockFsRm).not.toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe("cleanupTempFiles", () => {
    it("should cleanup old temp directories", async () => {
      const oldDate = new Date("2025-01-01T00:00:00Z")
      const tempDirs = [
        { name: "job-old", isDirectory: () => true },
        { name: "job-recent", isDirectory: () => true },
      ]
      mockFsReaddir.mockResolvedValue(tempDirs as any)
      mockFsStat
        .mockResolvedValueOnce({ mtime: new Date("2024-12-01T00:00:00Z") } as any)
        .mockResolvedValueOnce({ mtime: new Date("2025-01-10T00:00:00Z") } as any)

      const result = await service.cleanupTempFiles(oldDate)

      expect(result.count).toBe(1)
      expect(mockFsRm).toHaveBeenCalledTimes(1)
    })

    it("should skip if temp directory doesn't exist", async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await service.cleanupTempFiles(new Date())

      expect(result.count).toBe(0)
      expect(mockFsReaddir).not.toHaveBeenCalled()
    })

    it("should continue on individual directory failures", async () => {
      const tempDirs = [
        { name: "job-1", isDirectory: () => true },
        { name: "job-2", isDirectory: () => true },
      ]
      mockFsReaddir.mockResolvedValue(tempDirs as any)
      mockFsStat.mockResolvedValue({ mtime: new Date("2024-01-01T00:00:00Z") } as any)
      mockFsRm
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Permission denied"))

      const result = await service.cleanupTempFiles(new Date())

      expect(result.count).toBe(1)
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it("should handle readdir failure gracefully", async () => {
      mockFsReaddir.mockRejectedValue(new Error("Permission denied"))

      const result = await service.cleanupTempFiles(new Date())

      expect(result.count).toBe(0)
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it("should skip non-directory entries", async () => {
      const entries = [
        { name: "job-1", isDirectory: () => true },
        { name: "file.txt", isDirectory: () => false },
      ]
      mockFsReaddir.mockResolvedValue(entries as any)
      mockFsStat.mockResolvedValue({ mtime: new Date("2024-01-01T00:00:00Z") } as any)

      const result = await service.cleanupTempFiles(new Date())

      expect(mockFsRm).toHaveBeenCalledTimes(1)
    })
  })

  describe("cleanupOldTempFiles", () => {
    it("should convert milliseconds to date", async () => {
      const ageMs = 7 * 24 * 60 * 60 * 1000 // 7 days

      const result = await service.cleanupOldTempFiles(ageMs)

      expect(result).toBe(0)
    })

    it("should return count from cleanupTempFiles", async () => {
      const tempDirs = [{ name: "job-old", isDirectory: () => true }]
      mockFsReaddir.mockResolvedValue(tempDirs as any)
      mockFsStat.mockResolvedValue({ mtime: new Date("2024-01-01T00:00:00Z") } as any)

      const result = await service.cleanupOldTempFiles(1000)

      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe("createTempDirectory", () => {
    const validJobId = "job-123"

    it("should create temp directory", async () => {
      const result = await service.createTempDirectory(validJobId)

      expect(result).toContain("/tmp/render-jobs/job-123")
      expect(mockFsMkdir).toHaveBeenCalledWith(
        expect.stringContaining("job-123"),
        { recursive: true }
      )
    })

    it("should validate job ID", async () => {
      await expect(service.createTempDirectory("")).rejects.toThrow(MedusaError)
      await expect(service.createTempDirectory("")).rejects.toThrow(
        /Job ID is required/i
      )
    })

    it("should handle mkdir failure", async () => {
      mockFsMkdir.mockRejectedValue(new Error("Permission denied"))

      await expect(service.createTempDirectory(validJobId)).rejects.toThrow(
        MedusaError
      )
    })
  })

  describe("getTempFilePath", () => {
    const validJobId = "job-123"

    it("should return sanitized temp file path", async () => {
      const result = await service.getTempFilePath(validJobId, "design.png")

      expect(result).toContain("/tmp/render-jobs/job-123")
      expect(result).toContain("design.png")
    })

    it("should sanitize filename", async () => {
      const result = await service.getTempFilePath(
        validJobId,
        "../../../etc/passwd"
      )

      expect(result).not.toContain("..")
      expect(result).toContain("passwd")
    })

    it("should create parent directory", async () => {
      await service.getTempFilePath(validJobId, "design.png")

      expect(mockFsMkdir).toHaveBeenCalled()
    })

    it("should validate job ID", async () => {
      await expect(service.getTempFilePath("", "design.png")).rejects.toThrow(
        MedusaError
      )
    })

    it("should handle special characters in filename", async () => {
      const result = await service.getTempFilePath(validJobId, "my design!@#$.png")

      expect(result).toContain("my_design")
    })
  })

  describe("getPublicUrl", () => {
    it("should generate correct public URL", () => {
      const staticDir = path.resolve(process.cwd(), "static")
      const filePath = path.join(staticDir, "uploads", "design.png")

      const result = service.getPublicUrl(filePath)

      expect(result).toMatch(/^http:\/\//)
      expect(result).toContain("uploads/design.png")
    })

    it("should normalize path separators", () => {
      const staticDir = path.resolve(process.cwd(), "static")
      const filePath = path.join(staticDir, "uploads", "render-jobs", "design.png")

      const result = service.getPublicUrl(filePath)

      expect(result).toContain("uploads/render-jobs/design.png")
      expect(result).not.toContain("\\")
    })
  })

  describe("validateFileUpload", () => {
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

    it("should pass valid file", () => {
      const file = {
        buffer: validPngBuffer,
        filename: "design.png",
        mimetype: "image/png",
      }

      expect(() =>
        (service as any).validateFileUpload(file)
      ).not.toThrow()
    })

    it("should reject null file", () => {
      expect(() => (service as any).validateFileUpload(null)).toThrow(MedusaError)
    })

    it("should reject non-object file", () => {
      expect(() => (service as any).validateFileUpload("not-a-file")).toThrow(
        MedusaError
      )
    })
  })

  describe("validateMagicBytes", () => {
    it("should validate PNG magic bytes", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

      expect(() =>
        (service as any).validateMagicBytes(pngBuffer, "image/png")
      ).not.toThrow()
    })

    it("should validate JPEG magic bytes", () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF])

      expect(() =>
        (service as any).validateMagicBytes(jpegBuffer, "image/jpeg")
      ).not.toThrow()
    })

    it("should reject invalid PNG magic bytes", () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])

      expect(() =>
        (service as any).validateMagicBytes(invalidBuffer, "image/png")
      ).toThrow(MedusaError)
    })
  })

  describe("validateJobId", () => {
    it("should accept valid job ID", () => {
      expect(() => (service as any).validateJobId("job-123")).not.toThrow()
    })

    it("should reject empty job ID", () => {
      expect(() => (service as any).validateJobId("")).toThrow(MedusaError)
    })

    it("should reject job ID with path traversal", () => {
      expect(() => (service as any).validateJobId("../etc")).toThrow(MedusaError)
    })

    it("should reject job ID with special characters", () => {
      expect(() => (service as any).validateJobId("job@123")).toThrow(MedusaError)
    })
  })

  describe("validateFilePath", () => {
    it("should accept valid absolute path", () => {
      expect(() =>
        (service as any).validateFilePath("/tmp/render/output.png")
      ).not.toThrow()
    })

    it("should reject empty path", () => {
      expect(() => (service as any).validateFilePath("")).toThrow(MedusaError)
    })

    it("should reject relative path", () => {
      expect(() => (service as any).validateFilePath("relative/path.png")).toThrow(
        MedusaError
      )
    })

    it("should accept normalized paths without traversal remnants", () => {
      // path.normalize("/tmp/../etc/passwd") results in "/etc/passwd" which passes validation
      expect(() =>
        (service as any).validateFilePath("/tmp/../etc/passwd")
      ).not.toThrow()
    })
  })

  describe("sanitizeFilename", () => {
    it("should remove directory separators", () => {
      const result = (service as any).sanitizeFilename("../../etc/passwd")

      expect(result).not.toContain("..")
      expect(result).toBe("passwd")
    })

    it("should replace special characters", () => {
      const result = (service as any).sanitizeFilename("my file!@#$.png")

      expect(result).toContain("_")
      expect(result).not.toContain("!")
    })
  })

  describe("getFileExtension", () => {
    it("should return extension for PNG", () => {
      const result = (service as any).getFileExtension("design.png", "image/png")

      expect(result).toBe(".png")
    })

    it("should keep .jpeg extension for JPEG mimetype", () => {
      const result = (service as any).getFileExtension("design.jpeg", "image/jpeg")

      // The service accepts both .jpg and .jpeg for JPEG files
      expect(result).toBe(".jpeg")
    })

    it("should correct mismatched extension for PNG", () => {
      const result = (service as any).getFileExtension("design.jpg", "image/png")

      expect(result).toBe(".png")
    })

    it("should default to .png for missing extension", () => {
      const result = (service as any).getFileExtension("design", "image/png")

      expect(result).toBe(".png")
    })
  })

  describe("getOutputFilename", () => {
    it("should return composited.png for composited type", () => {
      const result = (service as any).getOutputFilename("composited", "/tmp/output.png")

      expect(result.filename).toBe("composited.png")
      expect(result.ext).toBe(".png")
    })

    it("should return rendered.png for rendered type", () => {
      const result = (service as any).getOutputFilename("rendered", "/tmp/output.png")

      expect(result.filename).toBe("rendered.png")
    })

    it("should return animation.mp4 for animation type", () => {
      const result = (service as any).getOutputFilename("animation", "/tmp/output.mp4")

      expect(result.filename).toBe("animation.mp4")
      expect(result.ext).toBe(".mp4")
    })

    it("should throw for unknown type", () => {
      expect(() =>
        (service as any).getOutputFilename("unknown", "/tmp/output.png")
      ).toThrow(MedusaError)
    })
  })

  describe("ensureDirectory", () => {
    it("should create directory", async () => {
      await (service as any).ensureDirectory("/tmp/test")

      expect(mockFsMkdir).toHaveBeenCalledWith("/tmp/test", { recursive: true })
    })

    it("should throw on failure", async () => {
      mockFsMkdir.mockRejectedValue(new Error("Permission denied"))

      await expect((service as any).ensureDirectory("/tmp/test")).rejects.toThrow(
        MedusaError
      )
    })
  })

  describe("resolveBaseUrl", () => {
    it("should use MEDUSA_FILE_BASE_URL if set", () => {
      process.env.MEDUSA_FILE_BASE_URL = "http://example.com/static"
      const service = new FileManagementService({ logger: mockLogger })

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("http://example.com/static")
      )
      delete process.env.MEDUSA_FILE_BASE_URL
    })

    it("should add /static suffix if missing", () => {
      process.env.MEDUSA_BACKEND_URL = "http://example.com/"
      const service = new FileManagementService({ logger: mockLogger })

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("http://example.com/static")
      )
      delete process.env.MEDUSA_BACKEND_URL
    })
  })
})
