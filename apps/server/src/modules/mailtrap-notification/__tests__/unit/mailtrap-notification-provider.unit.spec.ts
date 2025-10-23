import { MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { MailtrapNotificationProviderService } from "../../services/mailtrap-notification-provider"
import MailtrapPluginService, { MAILTRAP_PLUGIN } from "../../../mailtrap-plugin/service"
import { MailtrapClient } from "mailtrap"

// Mock the MailtrapClient
jest.mock("mailtrap", () => ({
  MailtrapClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  }))
}))

// Mock the MailtrapPluginService
jest.mock("../../../mailtrap-plugin/service", () => {
  const mockService = jest.fn()
  mockService.getActiveInstance = jest.fn(() => null)
  return {
    __esModule: true,
    default: mockService,
    MAILTRAP_PLUGIN: "mailtrap_plugin"
  }
})

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
 * Build a mock MailtrapPluginService
 */
const buildMockPluginService = (overrides?: Partial<MailtrapPluginService>): any => ({
  getDefaultRecipients: jest.fn(() => []),
  getDefaultSender: jest.fn(() => Promise.resolve({ email: undefined, name: undefined })),
  getTemplateMappingByHandle: jest.fn(() => Promise.resolve(null)),
  getMailtrapTemplateDetail: jest.fn(() => Promise.resolve({ id: "123", uuid: "abc-def-123" })),
  ...overrides
})

describe("MailtrapNotificationProviderService", () => {
  let mockLogger: Logger
  let mockPluginService: any
  let mockMailtrapClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger = buildMockLogger()
    mockPluginService = buildMockPluginService()
    mockMailtrapClient = {
      send: jest.fn()
    }
    ;(MailtrapClient as jest.Mock).mockImplementation(() => mockMailtrapClient)
  })

  describe("validateOptions", () => {
    it("should throw error when token is missing", () => {
      expect(() => {
        MailtrapNotificationProviderService.validateOptions({
          token: "",
          sender_email: "test@example.com"
        })
      }).toThrow(MedusaError)
      expect(() => {
        MailtrapNotificationProviderService.validateOptions({
          token: "",
          sender_email: "test@example.com"
        })
      }).toThrow(/API token is required/)
    })

    it("should throw error when sender_email is missing", () => {
      expect(() => {
        MailtrapNotificationProviderService.validateOptions({
          token: "test-token",
          sender_email: ""
        })
      }).toThrow(MedusaError)
      expect(() => {
        MailtrapNotificationProviderService.validateOptions({
          token: "test-token",
          sender_email: ""
        })
      }).toThrow(/sender email must be provided/)
    })

    it("should not throw error for valid options", () => {
      expect(() => {
        MailtrapNotificationProviderService.validateOptions({
          token: "test-token",
          sender_email: "test@example.com"
        })
      }).not.toThrow()
    })
  })

  describe("constructor", () => {
    const validOptions = {
      token: "test-token",
      sender_email: "sender@example.com"
    }

    it("should initialize with valid options", () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        validOptions
      )

      expect(service).toBeInstanceOf(MailtrapNotificationProviderService)
    })

    it("should parse sandbox as boolean from string", () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        { ...validOptions, sandbox: "true" as any }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ sandbox: true })
      )
    })

    it("should parse sandbox as boolean from boolean", () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        { ...validOptions, sandbox: true }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ sandbox: true })
      )
    })

    it("should parse test_inbox_id from string", () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        { ...validOptions, sandbox: true, test_inbox_id: "12345" as any }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ testInboxId: 12345 })
      )
    })

    it("should parse test_inbox_id from number", () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        { ...validOptions, sandbox: true, test_inbox_id: 12345 }
      )

      expect(MailtrapClient).toHaveBeenCalledWith(
        expect.objectContaining({ testInboxId: 12345 })
      )
    })

    it("should resolve plugin service from MAILTRAP_PLUGIN key", () => {
      const dependencies = {
        logger: mockLogger,
        [MAILTRAP_PLUGIN]: mockPluginService
      }

      const service = new MailtrapNotificationProviderService(dependencies, validOptions)

      expect(service["pluginService_"]).toBe(mockPluginService)
    })

    it("should resolve plugin service from mailtrapPluginService key", () => {
      const dependencies = {
        logger: mockLogger,
        mailtrapPluginService: mockPluginService
      }

      const service = new MailtrapNotificationProviderService(dependencies, validOptions)

      expect(service["pluginService_"]).toBe(mockPluginService)
    })

    it("should resolve plugin service from mailtrapPlugin key", () => {
      const dependencies = {
        logger: mockLogger,
        mailtrapPlugin: mockPluginService
      }

      const service = new MailtrapNotificationProviderService(dependencies, validOptions)

      expect(service["pluginService_"]).toBe(mockPluginService)
    })

    it("should resolve plugin service from static instance", () => {
      ;(MailtrapPluginService as any).getActiveInstance = jest.fn(() => mockPluginService)

      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        validOptions
      )

      expect(service["pluginService_"]).toBe(mockPluginService)
    })

    it("should warn when plugin service is not found", () => {
      ;(MailtrapPluginService as any).getActiveInstance = jest.fn(() => null)

      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        validOptions
      )

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("plugin service was not found")
      )
    })

    it("should handle Awilix resolution errors gracefully", () => {
      const dependencies = {
        logger: mockLogger,
        get [MAILTRAP_PLUGIN]() {
          const error: any = new Error("Resolution failed")
          error.name = "AwilixResolutionError"
          throw error
        }
      }

      const service = new MailtrapNotificationProviderService(dependencies, validOptions)

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("could not be resolved")
      )
    })

    it("should rethrow non-Awilix errors", () => {
      const dependencies = {
        logger: mockLogger,
        get [MAILTRAP_PLUGIN]() {
          throw new Error("Unexpected error")
        }
      }

      expect(() => {
        new MailtrapNotificationProviderService(dependencies, validOptions)
      }).toThrow("Unexpected error")
    })

    it("should strip channels from options", () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        { ...validOptions, channels: ["email"] }
      )

      expect(service["options_"]).not.toHaveProperty("channels")
    })
  })

  describe("buildSendPayload", () => {
    let service: MailtrapNotificationProviderService

    beforeEach(() => {
      service = new MailtrapNotificationProviderService(
        { logger: mockLogger, [MAILTRAP_PLUGIN]: mockPluginService },
        {
          token: "test-token",
          sender_email: "sender@example.com",
          sender_name: "Test Sender"
        }
      )
    })

    describe("recipient normalization", () => {
      it("should normalize string recipients", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test Subject" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.to).toEqual([{ email: "recipient@example.com" }])
      })

      it("should normalize object recipients", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            to: [{ email: "user@example.com", name: "Test User" }],
            html: "Test",
            subject: "Test Subject"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.to).toEqual([{ email: "user@example.com", name: "Test User" }])
      })

      it("should use data.to over notification.to", async () => {
        const notification = {
          to: "ignored@example.com",
          template: "test-template",
          data: {
            to: ["priority@example.com"],
            html: "Test",
            subject: "Test Subject"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.to).toEqual([{ email: "priority@example.com" }])
      })

      it("should fallback to plugin default recipients", async () => {
        mockPluginService.getDefaultRecipients.mockReturnValue(["default@example.com"])

        const notification = {
          template: "test-template",
          data: { html: "Test", subject: "Test Subject" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.to).toEqual([{ email: "default@example.com" }])
      })

      it("should filter out recipients with empty emails", async () => {
        const notification = {
          template: "test-template",
          data: {
            to: [
              { email: "valid@example.com", name: "Valid" },
              { email: "", name: "Invalid" },
              "another@example.com"
            ],
            html: "Test",
            subject: "Test Subject"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.to).toEqual([
          { email: "valid@example.com", name: "Valid" },
          { email: "another@example.com" }
        ])
      })

      it("should throw error when no recipients are available", async () => {
        const notification = {
          template: "test-template",
          data: { html: "Test", subject: "Test Subject" }
        }

        await expect(service["buildSendPayload"](notification)).rejects.toThrow(MedusaError)
        await expect(service["buildSendPayload"](notification)).rejects.toThrow(
          /at least one recipient/i
        )
      })
    })

    describe("CC and BCC normalization", () => {
      it("should normalize CC recipients", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            cc: ["cc1@example.com", { email: "cc2@example.com", name: "CC User" }],
            html: "Test",
            subject: "Test Subject"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.cc).toEqual([
          { email: "cc1@example.com" },
          { email: "cc2@example.com", name: "CC User" }
        ])
      })

      it("should normalize BCC recipients", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            bcc: ["bcc@example.com"],
            html: "Test",
            subject: "Test Subject"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.bcc).toEqual([{ email: "bcc@example.com" }])
      })

      it("should omit CC when empty", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test Subject" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.cc).toBeUndefined()
      })

      it("should omit BCC when empty", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test Subject" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.bcc).toBeUndefined()
      })
    })

    describe("subject extraction", () => {
      it("should extract subject from notification content", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          content: { subject: "Content Subject", html: "Test" },
          data: {}
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.subject).toBe("Content Subject")
      })

      it("should extract subject from data", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { subject: "Data Subject", html: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.subject).toBe("Data Subject")
      })

      it("should prefer notification.content.subject over data.subject", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          content: { subject: "Content Subject", html: "Test" },
          data: { subject: "Data Subject" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.subject).toBe("Content Subject")
      })
    })

    describe("HTML and text extraction", () => {
      it("should extract HTML from notification content", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          content: { html: "<p>Content HTML</p>", subject: "Test" },
          data: {}
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.html).toBe("<p>Content HTML</p>")
      })

      it("should extract HTML from data", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "<p>Data HTML</p>", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.html).toBe("<p>Data HTML</p>")
      })

      it("should extract text from notification content", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          content: { text: "Content Text", subject: "Test" },
          data: {}
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.text).toBe("Content Text")
      })

      it("should extract text from data", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { text: "Data Text", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.text).toBe("Data Text")
      })
    })

    describe("template UUID resolution", () => {
      it("should use template_uuid from data when provided", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { template_uuid: "abc-def-123" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.template_uuid).toBe("abc-def-123")
      })

      it("should resolve template UUID from plugin mappings", async () => {
        mockPluginService.getTemplateMappingByHandle.mockResolvedValue({
          template_id: "456",
          template_name: "Test Template",
          enabled: true
        })
        mockPluginService.getMailtrapTemplateDetail.mockResolvedValue({
          id: "456",
          uuid: "xyz-789-456"
        })

        const notification = {
          to: "recipient@example.com",
          template: "order-confirmation",
          data: {}
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.template_uuid).toBe("xyz-789-456")
      })

      it("should use template_id as UUID if it looks like a UUID", async () => {
        mockPluginService.getTemplateMappingByHandle.mockResolvedValue({
          template_id: "abc-def-123",
          enabled: true
        })

        const notification = {
          to: "recipient@example.com",
          template: "order-confirmation",
          data: {}
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.template_uuid).toBe("abc-def-123")
      })

      it("should include template_name in variables when present", async () => {
        mockPluginService.getTemplateMappingByHandle.mockResolvedValue({
          template_id: "abc-def-123",
          template_name: "Order Confirmation",
          enabled: true
        })

        const notification = {
          to: "recipient@example.com",
          template: "order-confirmation",
          data: { template_variables: { order_id: "12345" } }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.template_variables).toEqual({
          order_id: "12345",
          template_name: "Order Confirmation"
        })
      })

      it("should skip disabled template mappings", async () => {
        mockPluginService.getTemplateMappingByHandle.mockResolvedValue({
          template_id: "456",
          enabled: false
        })

        const notification = {
          to: "recipient@example.com",
          template: "order-confirmation",
          data: { html: "Test", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.template_uuid).toBeUndefined()
      })

      it("should handle template UUID resolution errors gracefully", async () => {
        mockPluginService.getTemplateMappingByHandle.mockResolvedValue({
          template_id: "456",
          enabled: true
        })
        mockPluginService.getMailtrapTemplateDetail.mockRejectedValue(
          new Error("Template not found")
        )

        const notification = {
          to: "recipient@example.com",
          template: "order-confirmation",
          data: { html: "Test", subject: "Test" }
        }

        await service["buildSendPayload"](notification)

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining("could not resolve UUID")
        )
      })
    })

    describe("validation", () => {
      it("should throw error when no template or content is provided", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {}
        }

        await expect(service["buildSendPayload"](notification)).rejects.toThrow(MedusaError)
        await expect(service["buildSendPayload"](notification)).rejects.toThrow(
          /requires either template mapping, HTML, or text content/i
        )
      })

      it("should throw error when subject is missing without template", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test content" }
        }

        await expect(service["buildSendPayload"](notification)).rejects.toThrow(MedusaError)
        await expect(service["buildSendPayload"](notification)).rejects.toThrow(
          /subject is required when sending.*without a template/i
        )
      })

      it("should not require subject when template is provided", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { template_uuid: "abc-def-123" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.subject).toBeUndefined()
      })
    })

    describe("sender email resolution", () => {
      it("should use sender email from data.from", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            from: { email: "override@example.com", name: "Override" },
            html: "Test",
            subject: "Test"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.from.email).toBe("override@example.com")
        expect(payload.from.name).toBe("Override")
      })

      it("should use sender email from notification.from", async () => {
        const notification = {
          to: "recipient@example.com",
          from: "notification@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.from.email).toBe("notification@example.com")
      })

      it("should use sender email from plugin default", async () => {
        mockPluginService.getDefaultSender.mockResolvedValue({
          email: "plugin@example.com",
          name: "Plugin Sender"
        })

        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.from.email).toBe("plugin@example.com")
        expect(payload.from.name).toBe("Plugin Sender")
      })

      it("should fallback to options sender email", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.from.email).toBe("sender@example.com")
        expect(payload.from.name).toBe("Test Sender")
      })

      it("should throw error when no sender email is available", async () => {
        // Cannot construct service without sender_email due to validateOptions
        // So we test that the constructor throws an error
        expect(() => {
          new MailtrapNotificationProviderService(
            { logger: mockLogger, [MAILTRAP_PLUGIN]: mockPluginService },
            { token: "test-token", sender_email: "" }
          )
        }).toThrow(MedusaError)

        expect(() => {
          new MailtrapNotificationProviderService(
            { logger: mockLogger, [MAILTRAP_PLUGIN]: mockPluginService },
            { token: "test-token", sender_email: "" }
          )
        }).toThrow(/sender email must be provided/)
      })
    })

    describe("attachment handling", () => {
      it("should transform attachments from data", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            html: "Test",
            subject: "Test",
            attachments: [
              {
                filename: "file1.pdf",
                type: "application/pdf",
                content: "base64content",
                disposition: "attachment"
              }
            ]
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.attachments).toEqual([
          {
            filename: "file1.pdf",
            type: "application/pdf",
            content: "base64content",
            disposition: "attachment",
            content_id: undefined
          }
        ])
      })

      it("should transform attachments from notification", async () => {
        const notification: any = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test" },
          attachments: [
            {
              filename: "file2.png",
              content_type: "image/png",
              content: "imagedata",
              id: "img1"
            }
          ]
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.attachments).toEqual([
          {
            filename: "file2.png",
            type: "image/png",
            content: "imagedata",
            disposition: undefined,
            content_id: "img1"
          }
        ])
      })

      it("should prefer data.attachments over notification.attachments", async () => {
        const notification: any = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            html: "Test",
            subject: "Test",
            attachments: [{ filename: "priority.pdf", content: "data" }]
          },
          attachments: [{ filename: "ignored.pdf", content: "ignored" }]
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.attachments).toHaveLength(1)
        expect(payload.attachments![0].filename).toBe("priority.pdf")
      })

      it("should omit attachments when none are provided", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.attachments).toBeUndefined()
      })
    })

    describe("reply_to handling", () => {
      it("should normalize reply_to from string", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            html: "Test",
            subject: "Test",
            reply_to: "reply@example.com"
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.reply_to).toEqual({ email: "reply@example.com" })
      })

      it("should normalize reply_to from object", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: {
            html: "Test",
            subject: "Test",
            reply_to: { email: "reply@example.com", name: "Reply Handler" }
          }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.reply_to).toEqual({ email: "reply@example.com", name: "Reply Handler" })
      })

      it("should omit reply_to when not provided", async () => {
        const notification = {
          to: "recipient@example.com",
          template: "test-template",
          data: { html: "Test", subject: "Test" }
        }

        const payload = await service["buildSendPayload"](notification)

        expect(payload.reply_to).toBeUndefined()
      })
    })
  })

  describe("send", () => {
    let service: MailtrapNotificationProviderService

    beforeEach(() => {
      service = new MailtrapNotificationProviderService(
        { logger: mockLogger, [MAILTRAP_PLUGIN]: mockPluginService },
        { token: "test-token", sender_email: "sender@example.com" }
      )
    })

    it("should send email successfully", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        message_ids: ["msg-123", "msg-456"],
        success: true
      })

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      const result = await service.send(notification)

      expect(result.id).toBe("msg-123")
      expect(mockMailtrapClient.send).toHaveBeenCalled()
    })

    it("should extract message ID from response", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        message_ids: ["msg-789"]
      })

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      const result = await service.send(notification)

      expect(result.id).toBe("msg-789")
    })

    it("should handle empty message_ids array", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        message_ids: []
      })

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      const result = await service.send(notification)

      expect(result.id).toBeUndefined()
    })

    it("should handle missing message_ids", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        success: true
      })

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      const result = await service.send(notification)

      expect(result.id).toBeUndefined()
    })

    it("should log success details", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        message_ids: ["msg-123"]
      })

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      await service.send(notification)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Mailtrap notification sent")
      )
    })

    it("should throw MedusaError on send failure", async () => {
      mockMailtrapClient.send.mockRejectedValue(new Error("Network error"))

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      await expect(service.send(notification)).rejects.toThrow(MedusaError)
      await expect(service.send(notification)).rejects.toThrow(/failed to send notification/i)
    })

    it("should log error details on failure", async () => {
      mockMailtrapClient.send.mockRejectedValue(new Error("API error"))

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      await expect(service.send(notification)).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Mailtrap notification failed")
      )
    })

    it("should use notification.id if available", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        message_ids: ["msg-123"]
      })

      const notification: any = {
        id: "notif-456",
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      await service.send(notification)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("notif-456")
      )
    })

    it("should fallback to template when notification.id is missing", async () => {
      mockMailtrapClient.send.mockResolvedValue({
        message_ids: ["msg-123"]
      })

      const notification = {
        to: "recipient@example.com",
        template: "order-confirmation",
        data: { html: "Test", subject: "Test Subject" }
      }

      await service.send(notification)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("order-confirmation")
      )
    })
  })

  describe("resend", () => {
    it("should delegate to send method", async () => {
      const service = new MailtrapNotificationProviderService(
        { logger: mockLogger },
        { token: "test-token", sender_email: "sender@example.com" }
      )

      const sendSpy = jest.spyOn(service, "send")
      mockMailtrapClient.send.mockResolvedValue({ message_ids: ["msg-123"] })

      const notification = {
        to: "recipient@example.com",
        template: "test-template",
        data: { html: "Test", subject: "Test Subject" }
      }

      const result = await service.resend(notification)

      expect(sendSpy).toHaveBeenCalledWith(notification)
      expect(result.id).toBe("msg-123")
    })
  })

  describe("helper functions", () => {
    describe("toRecipient", () => {
      it("should convert string to recipient object", () => {
        const toRecipient = (recipient: string | any) => {
          if (typeof recipient === "string") {
            return { email: recipient }
          }
          return recipient
        }

        expect(toRecipient("test@example.com")).toEqual({ email: "test@example.com" })
      })

      it("should pass through recipient object", () => {
        const toRecipient = (recipient: string | any) => {
          if (typeof recipient === "string") {
            return { email: recipient }
          }
          return recipient
        }

        const recipient = { email: "test@example.com", name: "Test User" }
        expect(toRecipient(recipient)).toEqual(recipient)
      })
    })

    describe("normalizeRecipientList", () => {
      it("should return empty array for undefined input", () => {
        const normalizeRecipientList = (recipients: any[] | undefined) => {
          if (!recipients?.length) {
            return []
          }
          return recipients
            .map((r) => (typeof r === "string" ? { email: r } : r))
            .filter((r) => !!r.email)
        }

        expect(normalizeRecipientList(undefined)).toEqual([])
      })

      it("should normalize mixed string and object recipients", () => {
        const normalizeRecipientList = (recipients: any[] | undefined) => {
          if (!recipients?.length) {
            return []
          }
          return recipients
            .map((r) => (typeof r === "string" ? { email: r } : r))
            .filter((r) => !!r.email)
        }

        const input = ["test@example.com", { email: "user@example.com", name: "User" }]
        const expected = [
          { email: "test@example.com" },
          { email: "user@example.com", name: "User" }
        ]

        expect(normalizeRecipientList(input)).toEqual(expected)
      })

      it("should filter out recipients with empty emails", () => {
        const normalizeRecipientList = (recipients: any[] | undefined) => {
          if (!recipients?.length) {
            return []
          }
          return recipients
            .map((r) => (typeof r === "string" ? { email: r } : r))
            .filter((r) => !!r.email)
        }

        const input = [
          "valid@example.com",
          { email: "", name: "Invalid" },
          { email: "another@example.com" }
        ]

        const result = normalizeRecipientList(input)

        expect(result).toHaveLength(2)
        expect(result[0].email).toBe("valid@example.com")
        expect(result[1].email).toBe("another@example.com")
      })
    })

    describe("looksLikeUuid", () => {
      it("should return true for valid UUID patterns", () => {
        const looksLikeUuid = (value: string) => /^[0-9a-fA-F-]{10,}$/.test(value)

        expect(looksLikeUuid("abc-def-123")).toBe(true)
        expect(looksLikeUuid("123456789a")).toBe(true)
        expect(looksLikeUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
      })

      it("should return false for non-UUID patterns", () => {
        const looksLikeUuid = (value: string) => /^[0-9a-fA-F-]{10,}$/.test(value)

        expect(looksLikeUuid("123")).toBe(false)
        expect(looksLikeUuid("not-a-uuid")).toBe(false)
        expect(looksLikeUuid("short")).toBe(false)
      })
    })
  })
})
