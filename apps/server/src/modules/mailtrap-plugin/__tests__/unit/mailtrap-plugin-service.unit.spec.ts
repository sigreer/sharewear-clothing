import { MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import MailtrapPluginService from "../../service"
import { MailtrapClient } from "mailtrap"

// Mock the MailtrapClient
jest.mock("mailtrap", () => ({
  MailtrapClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    templates: {
      getList: jest.fn(),
      get: jest.fn()
    }
  }))
}))

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
  success: jest.fn()
})

/**
 * Build mock database methods
 */
const buildMockDbMethods = () => ({
  listMailtrapTemplateMappings: jest.fn(),
  createMailtrapTemplateMappings: jest.fn(),
  updateMailtrapTemplateMappings: jest.fn(),
  deleteMailtrapTemplateMappings: jest.fn()
})

describe("MailtrapPluginService", () => {
  let mockLogger: Logger
  let mockMailtrapClient: any
  let originalEnv: NodeJS.ProcessEnv

  beforeAll(() => {
    originalEnv = { ...process.env }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger = buildMockLogger()
    mockMailtrapClient = {
      send: jest.fn(),
      templates: {
        getList: jest.fn(),
        get: jest.fn()
      }
    }
    ;(MailtrapClient as jest.Mock).mockImplementation(() => mockMailtrapClient)

    // Clear environment variables
    delete process.env.MAILTRAP_API_TOKEN
    delete process.env.MAILTRAP_SENDER_EMAIL
    delete process.env.MAILTRAP_SENDER_NAME
    delete process.env.MAILTRAP_USE_SANDBOX
    delete process.env.MAILTRAP_TEST_INBOX_ID
    delete process.env.MAILTRAP_ACCOUNT_ID
    delete process.env.MAILTRAP_DEFAULT_RECIPIENTS
  })

  describe("constructor and initialization", () => {
    it("should throw error when token is missing", () => {
      expect(() => {
        new MailtrapPluginService({ logger: mockLogger }, {})
      }).toThrow(MedusaError)
      expect(() => {
        new MailtrapPluginService({ logger: mockLogger }, {})
      }).toThrow(/Missing Mailtrap API token/)
    })

    it("should initialize with token from options", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      expect(service).toBeInstanceOf(MailtrapPluginService)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Mailtrap plugin initialized")
      )
    })

    it("should initialize with token from environment", () => {
      process.env.MAILTRAP_API_TOKEN = "env-token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(service).toBeInstanceOf(MailtrapPluginService)
    })

    it("should set active instance on construction", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      expect(MailtrapPluginService.getActiveInstance()).toBe(service)
    })

    it("should mask token in logs", () => {
      new MailtrapPluginService({ logger: mockLogger }, { token: "test-token-12345" })

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("test***2345")
      )
    })

    it("should warn when sandbox is enabled without testInboxId", () => {
      new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", sandbox: true }
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("sandbox mode is enabled but")
      )
    })
  })

  describe("normalizeOptions", () => {
    it("should parse sandbox as boolean from string 'true'", () => {
      process.env.MAILTRAP_USE_SANDBOX = "true"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ sandbox: true })
      )
    })

    it("should parse sandbox as boolean from string 'false'", () => {
      process.env.MAILTRAP_USE_SANDBOX = "false"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ sandbox: false })
      )
    })

    it("should parse sandbox as boolean from boolean true", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", sandbox: true }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ sandbox: true })
      )
    })

    it("should default sandbox to false when not provided", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ sandbox: false })
      )
    })

    it("should parse testInboxId from string", () => {
      process.env.MAILTRAP_TEST_INBOX_ID = "12345"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, { sandbox: true })

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ testInboxId: 12345 })
      )
    })

    it("should parse testInboxId from number", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", sandbox: true, testInboxId: 67890 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ testInboxId: 67890 })
      )
    })

    it("should handle invalid testInboxId string", () => {
      process.env.MAILTRAP_TEST_INBOX_ID = "not-a-number"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, { sandbox: true })

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ testInboxId: undefined })
      )
    })

    it("should parse accountId from string", () => {
      process.env.MAILTRAP_ACCOUNT_ID = "54321"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 54321 })
      )
    })

    it("should parse accountId from number", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", accountId: 99999 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 99999 })
      )
    })

    it("should parse defaultRecipients from comma-separated string", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", defaultRecipients: "user1@test.com, user2@test.com, user3@test.com" }
      )

      expect(service.getDefaultRecipients()).toEqual([
        "user1@test.com",
        "user2@test.com",
        "user3@test.com"
      ])
    })

    it("should parse defaultRecipients from array", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", defaultRecipients: ["user1@test.com", "user2@test.com"] }
      )

      expect(service.getDefaultRecipients()).toEqual(["user1@test.com", "user2@test.com"])
    })

    it("should filter empty defaultRecipients entries", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", defaultRecipients: "user1@test.com,  , user2@test.com" }
      )

      expect(service.getDefaultRecipients()).toEqual(["user1@test.com", "user2@test.com"])
    })

    it("should parse defaultRecipients from environment", () => {
      process.env.MAILTRAP_DEFAULT_RECIPIENTS = "env1@test.com,env2@test.com"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(service.getDefaultRecipients()).toEqual(["env1@test.com", "env2@test.com"])
    })

    it("should parse senderEmail from environment", () => {
      process.env.MAILTRAP_SENDER_EMAIL = "sender@test.com"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(service.getDefaultSender()).resolves.toEqual({
        email: "sender@test.com",
        name: undefined
      })
    })

    it("should parse senderName from environment", () => {
      process.env.MAILTRAP_SENDER_NAME = "Test Sender"
      process.env.MAILTRAP_API_TOKEN = "token"

      const service = new MailtrapPluginService({ logger: mockLogger }, {})

      expect(service.getDefaultSender()).resolves.toEqual({
        email: undefined,
        name: "Test Sender"
      })
    })

    it("should prefer options over environment variables", () => {
      process.env.MAILTRAP_API_TOKEN = "env-token"
      process.env.MAILTRAP_ACCOUNT_ID = "111"

      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "option-token", accountId: 222 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ token: "option-token", accountId: 222 })
      )
    })
  })

  describe("buildMailtrapClient", () => {
    it("should build client with correct configuration", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", accountId: 12345 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith({
        token: "test-token",
        accountId: 12345,
        testInboxId: undefined,
        sandbox: false
      })
    })

    it("should include testInboxId when sandbox is enabled", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", sandbox: true, testInboxId: 999 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith({
        token: "test-token",
        accountId: undefined,
        testInboxId: 999,
        sandbox: true
      })
    })

    it("should omit testInboxId when sandbox is disabled", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", sandbox: false, testInboxId: 999 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith({
        token: "test-token",
        accountId: undefined,
        testInboxId: undefined,
        sandbox: false
      })
    })
  })

  describe("getActiveInstance", () => {
    it("should return null when no instance is active", () => {
      // Reset the active instance
      ;(MailtrapPluginService as any).activeInstance_ = null

      expect(MailtrapPluginService.getActiveInstance()).toBeNull()
    })

    it("should return the active instance", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      expect(MailtrapPluginService.getActiveInstance()).toBe(service)
    })
  })

  describe("template mappings CRUD", () => {
    let service: MailtrapPluginService
    let mockDbMethods: ReturnType<typeof buildMockDbMethods>

    beforeEach(() => {
      service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      mockDbMethods = buildMockDbMethods()
      service["listMailtrapTemplateMappings"] = mockDbMethods.listMailtrapTemplateMappings
      service["createMailtrapTemplateMappings"] = mockDbMethods.createMailtrapTemplateMappings
      service["updateMailtrapTemplateMappings"] = mockDbMethods.updateMailtrapTemplateMappings
      service["deleteMailtrapTemplateMappings"] = mockDbMethods.deleteMailtrapTemplateMappings
    })

    describe("listTemplateMappings", () => {
      it("should list all template mappings", async () => {
        const mockMappings = [
          { id: "1", notification_handle: "order-confirmation", template_id: "123" },
          { id: "2", notification_handle: "password-reset", template_id: "456" }
        ]
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue(mockMappings)

        const result = await service.listTemplateMappings()

        expect(result).toEqual(mockMappings)
        expect(mockDbMethods.listMailtrapTemplateMappings).toHaveBeenCalled()
      })
    })

    describe("getTemplateMappingByHandle", () => {
      it("should get template mapping by handle", async () => {
        const mockMapping = {
          id: "1",
          notification_handle: "order-confirmation",
          template_id: "123",
          enabled: true
        }
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([mockMapping])

        const result = await service.getTemplateMappingByHandle("order-confirmation")

        expect(result).toEqual(mockMapping)
        expect(mockDbMethods.listMailtrapTemplateMappings).toHaveBeenCalledWith(
          { notification_handle: "order-confirmation", enabled: true },
          { take: 1 }
        )
      })

      it("should return null when mapping not found", async () => {
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([])

        const result = await service.getTemplateMappingByHandle("non-existent")

        expect(result).toBeNull()
      })

      it("should only return enabled mappings", async () => {
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([])

        await service.getTemplateMappingByHandle("test-handle")

        expect(mockDbMethods.listMailtrapTemplateMappings).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: true }),
          expect.any(Object)
        )
      })
    })

    describe("upsertTemplateMapping", () => {
      it("should create new mapping when not exists", async () => {
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([])
        mockDbMethods.createMailtrapTemplateMappings.mockResolvedValue({
          id: "new-1",
          notification_handle: "new-notification",
          template_id: "789",
          enabled: true
        })

        const data = {
          notification_handle: "new-notification",
          template_id: "789"
        }

        const result = await service.upsertTemplateMapping(data)

        expect(mockDbMethods.createMailtrapTemplateMappings).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_handle: "new-notification",
            template_id: "789",
            enabled: true,
            last_synced_at: expect.any(Date)
          })
        )
        expect(result.id).toBe("new-1")
      })

      it("should update existing mapping", async () => {
        const existing = {
          id: "existing-1",
          notification_handle: "order-confirmation",
          template_id: "123"
        }
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([existing])
        mockDbMethods.updateMailtrapTemplateMappings.mockResolvedValue({
          ...existing,
          template_id: "456",
          enabled: true
        })

        const data = {
          notification_handle: "order-confirmation",
          template_id: "456"
        }

        const result = await service.upsertTemplateMapping(data)

        expect(mockDbMethods.updateMailtrapTemplateMappings).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "existing-1",
            notification_handle: "order-confirmation",
            template_id: "456",
            enabled: true,
            last_synced_at: expect.any(Date)
          })
        )
      })

      it("should default enabled to true", async () => {
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([])
        mockDbMethods.createMailtrapTemplateMappings.mockResolvedValue({
          id: "new-1",
          notification_handle: "test",
          template_id: "123",
          enabled: true
        })

        await service.upsertTemplateMapping({
          notification_handle: "test",
          template_id: "123"
        })

        expect(mockDbMethods.createMailtrapTemplateMappings).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: true })
        )
      })

      it("should respect provided enabled value", async () => {
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([])
        mockDbMethods.createMailtrapTemplateMappings.mockResolvedValue({
          id: "new-1",
          notification_handle: "test",
          template_id: "123",
          enabled: false
        })

        await service.upsertTemplateMapping({
          notification_handle: "test",
          template_id: "123",
          enabled: false
        })

        expect(mockDbMethods.createMailtrapTemplateMappings).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: false })
        )
      })

      it("should set last_synced_at timestamp", async () => {
        mockDbMethods.listMailtrapTemplateMappings.mockResolvedValue([])
        mockDbMethods.createMailtrapTemplateMappings.mockResolvedValue({
          id: "new-1",
          notification_handle: "test",
          template_id: "123"
        })

        const beforeTime = new Date()
        await service.upsertTemplateMapping({
          notification_handle: "test",
          template_id: "123"
        })
        const afterTime = new Date()

        const callArgs = mockDbMethods.createMailtrapTemplateMappings.mock.calls[0][0]
        expect(callArgs.last_synced_at).toBeInstanceOf(Date)
        expect(callArgs.last_synced_at.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
        expect(callArgs.last_synced_at.getTime()).toBeLessThanOrEqual(afterTime.getTime())
      })
    })

    describe("deleteTemplateMapping", () => {
      it("should delete mapping by id", async () => {
        mockDbMethods.deleteMailtrapTemplateMappings.mockResolvedValue(undefined)

        await service.deleteTemplateMapping("mapping-123")

        expect(mockDbMethods.deleteMailtrapTemplateMappings).toHaveBeenCalledWith("mapping-123")
      })
    })
  })

  describe("listMailtrapTemplates", () => {
    let service: MailtrapPluginService

    beforeEach(() => {
      service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", accountId: 12345 }
      )
    })

    it("should throw error when accountId is not configured", async () => {
      const serviceWithoutAccount = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      await expect(serviceWithoutAccount.listMailtrapTemplates()).rejects.toThrow(MedusaError)
      await expect(serviceWithoutAccount.listMailtrapTemplates()).rejects.toThrow(
        /Missing Mailtrap account ID/
      )
    })

    it("should fetch and normalize templates from response.data", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({
        data: [
          {
            id: 123,
            uuid: "abc-123",
            name: "Test Template",
            description: "Test description",
            updated_at: "2024-01-01"
          }
        ]
      })

      const result = await service.listMailtrapTemplates()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: "abc-123",
        uuid: "abc-123",
        numeric_id: "123",
        name: "Test Template",
        description: "Test description"
      })
    })

    it("should fetch and normalize templates from response.email_templates", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({
        email_templates: [
          { id: 456, name: "Email Template" }
        ]
      })

      const result = await service.listMailtrapTemplates()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Email Template")
    })

    it("should fetch and normalize templates from array response", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue([
        { id: 789, name: "Array Template" }
      ])

      const result = await service.listMailtrapTemplates()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Array Template")
    })

    it("should handle nested email_template structure", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({
        data: [
          {
            email_template: {
              id: 999,
              uuid: "xyz-999",
              name: "Nested Template",
              description: "Nested",
              edit_url: "https://edit.example.com",
              updated_at: "2024-02-01"
            }
          }
        ]
      })

      const result = await service.listMailtrapTemplates()

      expect(result[0]).toMatchObject({
        uuid: "xyz-999",
        numeric_id: "999",
        name: "Nested Template",
        description: "Nested",
        edit_url: "https://edit.example.com"
      })
    })

    it("should use UUID as identifier when available", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({
        data: [{ id: 111, uuid: "preferred-uuid", name: "Test" }]
      })

      const result = await service.listMailtrapTemplates()

      expect(result[0].id).toBe("preferred-uuid")
    })

    it("should fallback to numeric ID when UUID is missing", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({
        data: [{ id: 222, name: "Test" }]
      })

      const result = await service.listMailtrapTemplates()

      expect(result[0].id).toBe("222")
    })

    it("should default name to 'Unnamed Template'", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({
        data: [{ id: 333 }]
      })

      const result = await service.listMailtrapTemplates()

      expect(result[0].name).toBe("Unnamed Template")
    })

    it("should handle empty response", async () => {
      mockMailtrapClient.templates.getList.mockResolvedValue({ data: [] })

      const result = await service.listMailtrapTemplates()

      expect(result).toEqual([])
    })

    it("should handle API errors via handleMailtrapError", async () => {
      mockMailtrapClient.templates.getList.mockRejectedValue(
        new Error("API error")
      )

      await expect(service.listMailtrapTemplates()).rejects.toThrow(MedusaError)
    })
  })

  describe("getMailtrapTemplateDetail", () => {
    let service: MailtrapPluginService

    beforeEach(() => {
      service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", accountId: 12345 }
      )
    })

    it("should throw error when accountId is not configured", async () => {
      const serviceWithoutAccount = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      await expect(serviceWithoutAccount.getMailtrapTemplateDetail("123")).rejects.toThrow(
        MedusaError
      )
    })

    it("should fetch template by numeric ID", async () => {
      mockMailtrapClient.templates.get.mockResolvedValue({
        id: 123,
        uuid: "abc-123",
        name: "Test Template",
        subject: "Test Subject",
        body_html: "<p>HTML</p>",
        body_text: "Text"
      })

      const result = await service.getMailtrapTemplateDetail("123")

      expect(mockMailtrapClient.templates.get).toHaveBeenCalledWith(123)
      expect(result).toMatchObject({
        id: "abc-123",
        uuid: "abc-123",
        numeric_id: "123",
        name: "Test Template",
        subject: "Test Subject",
        html: "<p>HTML</p>",
        text: "Text"
      })
    })

    it("should fetch template by UUID via listing", async () => {
      mockMailtrapClient.templates.getList = jest.fn().mockResolvedValue({
        data: [
          { id: 456, uuid: "xyz-456", name: "UUID Template" }
        ]
      })
      mockMailtrapClient.templates.get.mockResolvedValue({
        id: 456,
        uuid: "xyz-456",
        name: "UUID Template"
      })

      const result = await service.getMailtrapTemplateDetail("xyz-456")

      expect(mockMailtrapClient.templates.get).toHaveBeenCalledWith(456)
    })

    it("should throw error when template not found by UUID", async () => {
      mockMailtrapClient.templates.getList = jest.fn().mockResolvedValue({ data: [] })

      await expect(service.getMailtrapTemplateDetail("non-existent-uuid")).rejects.toThrow(
        MedusaError
      )
      await expect(service.getMailtrapTemplateDetail("non-existent-uuid")).rejects.toThrow(
        /Unable to locate Mailtrap template/
      )
    })

    it("should handle NaN numeric identifier", async () => {
      mockMailtrapClient.templates.getList = jest.fn().mockResolvedValue({ data: [] })

      await expect(service.getMailtrapTemplateDetail("not-a-number")).rejects.toThrow()
    })

    it("should normalize template detail correctly", async () => {
      mockMailtrapClient.templates.get.mockResolvedValue({
        id: 789,
        uuid: "detail-uuid",
        name: "Detail Template",
        subject: "Subject",
        body_html: "<html></html>",
        body_text: "plain text",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
        description: "Description"
      })

      const result = await service.getMailtrapTemplateDetail("789")

      expect(result).toEqual({
        id: "detail-uuid",
        uuid: "detail-uuid",
        numeric_id: "789",
        name: "Detail Template",
        subject: "Subject",
        html: "<html></html>",
        text: "plain text",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
        description: "Description"
      })
    })
  })

  describe("getDefaultSender", () => {
    it("should return sender email and name", async () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", senderEmail: "sender@test.com", senderName: "Test Sender" }
      )

      const result = await service.getDefaultSender()

      expect(result).toEqual({
        email: "sender@test.com",
        name: "Test Sender"
      })
    })

    it("should return undefined values when not configured", async () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      const result = await service.getDefaultSender()

      expect(result).toEqual({
        email: undefined,
        name: undefined
      })
    })
  })

  describe("getDefaultRecipients", () => {
    it("should return copy of default recipients array", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", defaultRecipients: ["user1@test.com", "user2@test.com"] }
      )

      const result1 = service.getDefaultRecipients()
      const result2 = service.getDefaultRecipients()

      expect(result1).toEqual(["user1@test.com", "user2@test.com"])
      expect(result1).not.toBe(result2) // Different array instances
    })

    it("should return empty array when not configured", () => {
      const service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      const result = service.getDefaultRecipients()

      expect(result).toEqual([])
    })
  })

  describe("sendTestEmail", () => {
    let service: MailtrapPluginService

    beforeEach(() => {
      service = new MailtrapPluginService(
        { logger: mockLogger },
        {
          token: "test-token",
          accountId: 12345,
          senderEmail: "sender@test.com",
          senderName: "Test Sender",
          defaultRecipients: ["default@test.com"]
        }
      )
    })

    it("should send test email with provided recipients", async () => {
      mockMailtrapClient.send.mockResolvedValue({ success: true })

      await service.sendTestEmail("abc-def-123", {
        to: ["recipient@test.com"],
        variables: { name: "Test User" }
      })

      expect(mockMailtrapClient.send).toHaveBeenCalledWith({
        from: { email: "sender@test.com", name: "Test Sender" },
        to: [{ email: "recipient@test.com" }],
        template_uuid: "abc-def-123",
        template_variables: { name: "Test User" }
      })
    })

    it("should use default recipients when none provided", async () => {
      mockMailtrapClient.send.mockResolvedValue({ success: true })

      await service.sendTestEmail("abc-def-123", {})

      expect(mockMailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: "default@test.com" }]
        })
      )
    })

    it("should filter out empty recipient strings", async () => {
      mockMailtrapClient.send.mockResolvedValue({ success: true })

      await service.sendTestEmail("abc-def-123", {
        to: ["valid@test.com", "", "  ", "another@test.com"]
      })

      expect(mockMailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: "valid@test.com" }, { email: "another@test.com" }]
        })
      )
    })

    it("should throw error when no recipients available", async () => {
      const serviceWithoutDefaults = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token", senderEmail: "sender@test.com" }
      )

      await expect(serviceWithoutDefaults.sendTestEmail("abc-def-123", {})).rejects.toThrow(
        MedusaError
      )
      await expect(serviceWithoutDefaults.sendTestEmail("abc-def-123", {})).rejects.toThrow(
        /at least one recipient email/i
      )
    })

    it("should throw error when no sender email configured", async () => {
      const serviceWithoutSender = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )

      await expect(
        serviceWithoutSender.sendTestEmail("abc-def-123", { to: ["user@test.com"] })
      ).rejects.toThrow(MedusaError)
      await expect(
        serviceWithoutSender.sendTestEmail("abc-def-123", { to: ["user@test.com"] })
      ).rejects.toThrow(/requires a sender email/i)
    })

    it("should resolve template UUID from numeric ID", async () => {
      mockMailtrapClient.templates.get.mockResolvedValue({
        id: 123,
        uuid: "resolved-uuid",
        name: "Test Template"
      })
      mockMailtrapClient.send.mockResolvedValue({ success: true })

      await service.sendTestEmail("123", { to: ["user@test.com"] })

      expect(mockMailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template_uuid: "resolved-uuid"
        })
      )
    })

    it("should use template identifier as UUID if it looks like UUID", async () => {
      mockMailtrapClient.send.mockResolvedValue({ success: true })
      // Mock listMailtrapTemplates to return empty so it won't try to resolve via API
      const spy = jest.spyOn(service as any, "listMailtrapTemplates")
      spy.mockResolvedValue([])

      // Use a valid UUID pattern that the looksLikeUuid function will accept
      await service.sendTestEmail("abc-def-12345678", { to: ["user@test.com"] })

      expect(mockMailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template_uuid: "abc-def-12345678"
        })
      )
    })

    it("should throw error when template UUID cannot be determined", async () => {
      // Mock getMailtrapTemplateDetail to return a detail without UUID or id
      mockMailtrapClient.templates.get.mockResolvedValue({
        name: "Test Template"
        // No uuid or id field - this should cause normalizeTemplateDetail to throw
      })

      await expect(service.sendTestEmail("123", { to: ["user@test.com"] })).rejects.toThrow(
        MedusaError
      )
    })

    it("should use custom fromEmail and fromName", async () => {
      mockMailtrapClient.send.mockResolvedValue({ success: true })

      await service.sendTestEmail("abc-def-123", {
        to: ["user@test.com"],
        fromEmail: "custom@test.com",
        fromName: "Custom Sender"
      })

      expect(mockMailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { email: "custom@test.com", name: "Custom Sender" }
        })
      )
    })

    it("should default template_variables to empty object", async () => {
      mockMailtrapClient.send.mockResolvedValue({ success: true })

      await service.sendTestEmail("abc-def-123", { to: ["user@test.com"] })

      expect(mockMailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template_variables: {}
        })
      )
    })

    it("should handle API errors via handleMailtrapError", async () => {
      mockMailtrapClient.send.mockRejectedValue(new Error("Send failed"))

      await expect(
        service.sendTestEmail("abc-def-123", { to: ["user@test.com"] })
      ).rejects.toThrow(MedusaError)
    })
  })

  describe("helper methods", () => {
    let service: MailtrapPluginService

    beforeEach(() => {
      service = new MailtrapPluginService(
        { logger: mockLogger },
        { token: "test-token" }
      )
    })

    describe("looksLikeUuid", () => {
      it("should return true for valid UUID patterns", () => {
        expect(service["looksLikeUuid"]("abc-def-123")).toBe(true)
        expect(service["looksLikeUuid"]("123456789a")).toBe(true)
        expect(service["looksLikeUuid"]("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
      })

      it("should return false for non-UUID patterns", () => {
        expect(service["looksLikeUuid"]("123")).toBe(false)
        expect(service["looksLikeUuid"]("short")).toBe(false)
        expect(service["looksLikeUuid"]("not-valid")).toBe(false)
      })
    })

    describe("maskSecret", () => {
      it("should mask long secrets correctly", () => {
        const result = service["maskSecret"]("verylongsecrettoken12345")

        expect(result).toBe("very***2345")
      })

      it("should mask short secrets", () => {
        const result = service["maskSecret"]("1234")

        expect(result).toBe("1***")
      })

      it("should handle undefined", () => {
        const result = service["maskSecret"](undefined)

        expect(result).toBe("undefined")
      })

      it("should handle null", () => {
        const result = service["maskSecret"](null)

        expect(result).toBe("undefined")
      })

      it("should handle numeric secrets", () => {
        const result = service["maskSecret"](123456789)

        expect(result).toBe("1234***6789")
      })
    })

    describe("normalizeTemplateDetail", () => {
      it("should normalize template with UUID", () => {
        const template = {
          id: 123,
          uuid: "abc-123",
          name: "Test Template",
          subject: "Test",
          body_html: "<p>HTML</p>",
          body_text: "Text",
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
          description: "Description"
        }

        const result = service["normalizeTemplateDetail"](template)

        expect(result).toEqual({
          id: "abc-123",
          uuid: "abc-123",
          numeric_id: "123",
          name: "Test Template",
          subject: "Test",
          html: "<p>HTML</p>",
          text: "Text",
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
          description: "Description"
        })
      })

      it("should normalize template without UUID", () => {
        const template = {
          id: 456,
          name: "No UUID Template"
        }

        const result = service["normalizeTemplateDetail"](template)

        expect(result).toMatchObject({
          id: "456",
          uuid: undefined,
          numeric_id: "456",
          name: "No UUID Template"
        })
      })

      it("should default name to 'Unnamed template'", () => {
        const template = { id: 789 }

        const result = service["normalizeTemplateDetail"](template)

        expect(result.name).toBe("Unnamed template")
      })

      it("should throw error when template has no identifier", () => {
        const template = {}

        expect(() => service["normalizeTemplateDetail"](template)).toThrow(MedusaError)
        expect(() => service["normalizeTemplateDetail"](template)).toThrow(
          /without an identifier/
        )
      })
    })

    describe("handleMailtrapError", () => {
      it("should throw MedusaError with default message", () => {
        const error = new Error("Test error")

        expect(() => service["handleMailtrapError"](error, "test action")).toThrow(MedusaError)
        expect(() => service["handleMailtrapError"](error, "test action")).toThrow(
          /Unable to test action/
        )
      })

      it("should extract status from error response", () => {
        const error = {
          response: {
            status: 401,
            data: { message: "Unauthorized" }
          }
        }

        expect(() => service["handleMailtrapError"](error, "authenticate")).toThrow(/status 401/)
      })

      it("should extract message from response data", () => {
        const error = {
          response: {
            status: 400,
            data: { message: "Invalid request" }
          }
        }

        expect(() => service["handleMailtrapError"](error, "send")).toThrow(/Invalid request/)
      })

      it("should extract error from response data", () => {
        const error = {
          response: {
            data: { error: "Bad request" }
          }
        }

        expect(() => service["handleMailtrapError"](error, "send")).toThrow(/Bad request/)
      })

      it("should extract nested error message", () => {
        const error = {
          response: {
            data: { error: { message: "Nested error message" } }
          }
        }

        expect(() => service["handleMailtrapError"](error, "send")).toThrow(/Nested error message/)
      })

      it("should use error message as fallback", () => {
        const error = new Error("Fallback message")

        expect(() => service["handleMailtrapError"](error, "test")).toThrow(/Fallback message/)
      })

      it("should throw UNAUTHORIZED error for 401 status", () => {
        const error = {
          response: {
            status: 401,
            data: {}
          }
        }

        try {
          service["handleMailtrapError"](error, "test")
        } catch (e) {
          expect(e).toBeInstanceOf(MedusaError)
          expect((e as MedusaError).type).toBe(MedusaError.Types.UNAUTHORIZED)
        }
      })

      it("should throw UNAUTHORIZED error for 403 status", () => {
        const error = {
          response: {
            status: 403,
            data: {}
          }
        }

        try {
          service["handleMailtrapError"](error, "test")
        } catch (e) {
          expect(e).toBeInstanceOf(MedusaError)
          expect((e as MedusaError).type).toBe(MedusaError.Types.UNAUTHORIZED)
        }
      })

      it("should include account hint for auth errors", () => {
        const serviceWithAccount = new MailtrapPluginService(
          { logger: mockLogger },
          { token: "test-token", accountId: 12345 }
        )

        const error = {
          response: {
            status: 401,
            data: {}
          }
        }

        expect(() => serviceWithAccount["handleMailtrapError"](error, "test")).toThrow(/12345/)
      })

      it("should log error details", () => {
        const error = {
          response: {
            status: 500,
            data: { message: "Server error" }
          }
        }

        try {
          service["handleMailtrapError"](error, "test action")
        } catch (e) {
          // Ignore throw
        }

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining("Mailtrap API error")
        )
      })
    })
  })
})
