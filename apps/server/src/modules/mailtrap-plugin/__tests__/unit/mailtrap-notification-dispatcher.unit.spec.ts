import {
  MailtrapNotificationDispatcher,
  MailtrapNotificationDispatcherDependencies,
  tryBuildMailtrapNotificationDispatcher,
  buildMailtrapNotificationDispatcher
} from "../../mailtrap-notification-dispatcher"
import { ProductTagWorkflowEvents } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type MailtrapPluginService from "../../service"

const buildDependencies = (
  overrides: Partial<MailtrapNotificationDispatcherDependencies> = {}
): MailtrapNotificationDispatcherDependencies => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as unknown as Logger

  const mailtrapPluginService = {
    listTemplateMappings: jest.fn().mockResolvedValue([]),
    getTemplateMappingByHandle: jest.fn().mockResolvedValue(null),
    getDefaultRecipients: jest.fn().mockResolvedValue([]),
    getDefaultSender: jest.fn().mockResolvedValue(null)
  } as unknown as MailtrapPluginService

  const notificationModuleService = {
    createNotifications: jest.fn().mockResolvedValue([])
  } as any

  const eventBusService = {
    subscribe: jest.fn()
  } as any

  const productModuleService = {
    listProductTags: jest.fn().mockResolvedValue([])
  } as any

  return {
    logger,
    mailtrapPluginService,
    notificationModuleService,
    eventBusService,
    productModuleService,
    ...overrides
  }
}

describe("MailtrapNotificationDispatcher", () => {
  describe("initialization", () => {
    it("should initialize and subscribe to enabled mappings", async () => {
      const dependencies = buildDependencies()
      const mockMappings = [
        { notification_handle: "order.placed", enabled: true, template_id: "tpl_1" },
        { notification_handle: "user.created", enabled: true, template_id: "tpl_2" },
        { notification_handle: "disabled.event", enabled: false, template_id: "tpl_3" }
      ];

      (dependencies.mailtrapPluginService.listTemplateMappings as jest.Mock).mockResolvedValue(
        mockMappings
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      await dispatcher.initialize()

      expect(dependencies.eventBusService.subscribe).toHaveBeenCalledTimes(2)
      expect(dependencies.eventBusService.subscribe).toHaveBeenCalledWith(
        "order.placed",
        expect.any(Function)
      )
      expect(dependencies.eventBusService.subscribe).toHaveBeenCalledWith(
        "user.created",
        expect.any(Function)
      )
      expect(dependencies.logger.info).toHaveBeenCalledWith(
        "Mailtrap dispatcher subscribed to event: order.placed"
      )
    })

    it("should not subscribe twice to the same handle", async () => {
      const dependencies = buildDependencies()
      const mockMappings = [
        { notification_handle: "order.placed", enabled: true, template_id: "tpl_1" }
      ];

      (dependencies.mailtrapPluginService.listTemplateMappings as jest.Mock).mockResolvedValue(
        mockMappings
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      await dispatcher.initialize()
      await dispatcher.refreshSubscriptionForHandle("order.placed")

      expect(dependencies.eventBusService.subscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe("refreshSubscriptionForHandle", () => {
    it("should subscribe if mapping is enabled", async () => {
      const dependencies = buildDependencies();

      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock).mockResolvedValue(
        { notification_handle: "test.event", enabled: true, template_id: "tpl_1" }
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      await dispatcher.refreshSubscriptionForHandle("test.event")

      expect(dependencies.eventBusService.subscribe).toHaveBeenCalledWith(
        "test.event",
        expect.any(Function)
      )
    })

    it("should not subscribe if mapping does not exist", async () => {
      const dependencies = buildDependencies();

      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock).mockResolvedValue(
        null
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      await dispatcher.refreshSubscriptionForHandle("nonexistent.event")

      expect(dependencies.eventBusService.subscribe).not.toHaveBeenCalled()
    })

    it("should not subscribe if mapping is disabled", async () => {
      const dependencies = buildDependencies();

      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock).mockResolvedValue(
        { notification_handle: "test.event", enabled: false, template_id: "tpl_1" }
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      await dispatcher.refreshSubscriptionForHandle("test.event")

      expect(dependencies.eventBusService.subscribe).not.toHaveBeenCalled()
    })
  })

  describe("handleEvent", () => {
    it("should create notifications for valid event with recipients", async () => {
      const dependencies = buildDependencies()
      const mockMapping = {
        notification_handle: "order.placed",
        enabled: true,
        template_id: "tpl_order"
      };

      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock).mockResolvedValue(
        mockMapping
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = {
        data: {
          id: "order_123",
          to: "customer@example.com"
        }
      }

      // Trigger event via subscribe callback
      ;(dependencies.eventBusService.subscribe as jest.Mock).mockImplementation(
        (handle, callback) => {
          if (handle === "order.placed") {
            callback(payload)
          }
        }
      )

      await dispatcher.refreshSubscriptionForHandle("order.placed")

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(dependencies.notificationModuleService.createNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            channel: "email",
            template: "order.placed",
            to: "customer@example.com",
            data: expect.objectContaining({
              template_uuid: "tpl_order"
            })
          })
        ])
      )
    })

    it("should skip event if no enabled mapping found", async () => {
      const dependencies = buildDependencies();

      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock).mockResolvedValue(
        null
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "test_123" } }

      ;(dependencies.eventBusService.subscribe as jest.Mock).mockImplementation(
        (handle, callback) => {
          if (handle === "test.event") {
            callback(payload)
          }
        }
      )

      await dispatcher.refreshSubscriptionForHandle("test.event")
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(dependencies.notificationModuleService.createNotifications).not.toHaveBeenCalled()
    })

    it("should warn if no recipients can be resolved", async () => {
      const dependencies = buildDependencies()
      const mockMapping = {
        notification_handle: "test.event",
        enabled: true,
        template_id: "tpl_test"
      };

      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock).mockResolvedValue(
        mockMapping
      );
      (dependencies.mailtrapPluginService.getDefaultRecipients as jest.Mock).mockResolvedValue([]);
      (dependencies.mailtrapPluginService.getDefaultSender as jest.Mock).mockResolvedValue(null)

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "test_123" } }

      ;(dependencies.eventBusService.subscribe as jest.Mock).mockImplementation(
        (handle, callback) => {
          if (handle === "test.event") {
            callback(payload)
          }
        }
      )

      await dispatcher.refreshSubscriptionForHandle("test.event")
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(dependencies.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("could not resolve recipients")
      )
      expect(dependencies.notificationModuleService.createNotifications).not.toHaveBeenCalled()
    })

    it("should handle errors gracefully", async () => {
      const dependencies = buildDependencies()
      const mockMapping = {
        notification_handle: "test.event",
        enabled: true,
        template_id: "tpl_test"
      };

      // First call succeeds for subscription, second call fails during event handling
      (dependencies.mailtrapPluginService.getTemplateMappingByHandle as jest.Mock)
        .mockResolvedValueOnce(mockMapping)
        .mockRejectedValueOnce(new Error("Database error"))

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "test_123" } }

      let callback: any
      ;(dependencies.eventBusService.subscribe as jest.Mock).mockImplementation(
        (handle, cb) => {
          if (handle === "test.event") {
            callback = cb
          }
        }
      )

      await dispatcher.refreshSubscriptionForHandle("test.event")

      // Trigger the event
      await callback(payload)

      expect(dependencies.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("failed to process event")
      )
    })
  })

  describe("buildIdempotencyKey", () => {
    it("should build idempotency key with payload id", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "order_123" } }

      const key = (dispatcher as any).buildIdempotencyKey("order.placed", payload, "test@example.com")

      expect(key).toBe("order.placed:test@example.com:order_123")
    })

    it("should build idempotency key with entity_id fallback", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { entity_id: "entity_456" } }

      const key = (dispatcher as any).buildIdempotencyKey("test.event", payload)

      expect(key).toBe("test.event:entity_456")
    })

    it("should return undefined if no id in payload", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: {} }

      const key = (dispatcher as any).buildIdempotencyKey("test.event", payload)

      expect(key).toBeUndefined()
    })
  })

  describe("resolveRecipients", () => {
    it("should extract recipients from payload data", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { to: "user@example.com" } }

      const recipients = await (dispatcher as any).resolveRecipients("test.event", payload)

      expect(recipients).toEqual(["user@example.com"])
    })

    it("should fall back to default recipients", async () => {
      const dependencies = buildDependencies();
      (dependencies.mailtrapPluginService.getDefaultRecipients as jest.Mock).mockResolvedValue([
        "default@example.com"
      ])

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: {} }

      const recipients = await (dispatcher as any).resolveRecipients("test.event", payload)

      expect(recipients).toEqual(["default@example.com"])
    })

    it("should fall back to default sender email", async () => {
      const dependencies = buildDependencies();
      (dependencies.mailtrapPluginService.getDefaultRecipients as jest.Mock).mockResolvedValue([]);
      (dependencies.mailtrapPluginService.getDefaultSender as jest.Mock).mockResolvedValue({
        email: "sender@example.com"
      })

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: {} }

      const recipients = await (dispatcher as any).resolveRecipients("test.event", payload)

      expect(recipients).toEqual(["sender@example.com"])
    })

    it("should return empty array if all fallbacks fail", async () => {
      const dependencies = buildDependencies();
      (dependencies.mailtrapPluginService.getDefaultRecipients as jest.Mock).mockResolvedValue([]);
      (dependencies.mailtrapPluginService.getDefaultSender as jest.Mock).mockResolvedValue(null)

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: {} }

      const recipients = await (dispatcher as any).resolveRecipients("test.event", payload)

      expect(recipients).toEqual([])
    })
  })

  describe("extractRecipientsFromPayload", () => {
    it("should extract string recipient", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { to: "user@example.com" } }

      const recipients = (dispatcher as any).extractRecipientsFromPayload(payload)

      expect(recipients).toEqual(["user@example.com"])
    })

    it("should extract array of string recipients", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { recipients: ["user1@example.com", "user2@example.com"] } }

      const recipients = (dispatcher as any).extractRecipientsFromPayload(payload)

      expect(recipients).toEqual(["user1@example.com", "user2@example.com"])
    })

    it("should extract emails from object array", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = {
        data: {
          recipients: [{ email: "user1@example.com" }, { email: "user2@example.com" }]
        }
      }

      const recipients = (dispatcher as any).extractRecipientsFromPayload(payload)

      expect(recipients).toEqual(["user1@example.com", "user2@example.com"])
    })

    it("should filter out null and invalid entries", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = {
        data: {
          recipients: ["user1@example.com", null, "", { email: "user2@example.com" }, { invalid: "data" }]
        }
      }

      const recipients = (dispatcher as any).extractRecipientsFromPayload(payload)

      expect(recipients).toEqual(["user1@example.com", "user2@example.com"])
    })

    it("should check email field in payload", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { email: "user@example.com" } }

      const recipients = (dispatcher as any).extractRecipientsFromPayload(payload)

      expect(recipients).toEqual(["user@example.com"])
    })

    it("should return empty array for invalid payload", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: null }

      const recipients = (dispatcher as any).extractRecipientsFromPayload(payload)

      expect(recipients).toEqual([])
    })
  })

  describe("buildTemplateVariables", () => {
    it("should build base template variables", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "test_123" }, metadata: { custom: "value" } }

      const variables = await (dispatcher as any).buildTemplateVariables("test.event", payload)

      expect(variables).toMatchObject({
        event_name: "test.event",
        event_payload: { id: "test_123" },
        event_metadata: { custom: "value" }
      })
      expect(variables.triggered_at).toBeDefined()
    })

    it("should include product tag details for tag events", async () => {
      const dependencies = buildDependencies()
      const mockTag = { id: "tag_123", value: "Summer", products: [] };

      (dependencies.productModuleService.listProductTags as jest.Mock).mockResolvedValue([mockTag])

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "tag_123" } }

      const variables = await (dispatcher as any).buildTemplateVariables(
        ProductTagWorkflowEvents.CREATED,
        payload
      )

      expect(variables.product_tag).toEqual(mockTag)
    })

    it("should handle missing product tag gracefully", async () => {
      const dependencies = buildDependencies();

      (dependencies.productModuleService.listProductTags as jest.Mock).mockResolvedValue([])

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "tag_123" } }

      const variables = await (dispatcher as any).buildTemplateVariables(
        ProductTagWorkflowEvents.UPDATED,
        payload
      )

      expect(variables.product_tag).toBeNull()
    })

    it("should handle product tag fetch error", async () => {
      const dependencies = buildDependencies();

      (dependencies.productModuleService.listProductTags as jest.Mock).mockRejectedValue(
        new Error("Database error")
      )

      const dispatcher = new MailtrapNotificationDispatcher(dependencies)
      const payload = { data: { id: "tag_123" } }

      const variables = await (dispatcher as any).buildTemplateVariables(
        ProductTagWorkflowEvents.DELETED,
        payload
      )

      expect(variables.product_tag).toBeNull()
      expect(dependencies.logger.error).toHaveBeenCalled()
    })
  })

  describe("isProductTagEvent", () => {
    it("should identify product tag events", async () => {
      const dependencies = buildDependencies()
      const dispatcher = new MailtrapNotificationDispatcher(dependencies)

      expect((dispatcher as any).isProductTagEvent(ProductTagWorkflowEvents.CREATED)).toBe(true)
      expect((dispatcher as any).isProductTagEvent(ProductTagWorkflowEvents.UPDATED)).toBe(true)
      expect((dispatcher as any).isProductTagEvent(ProductTagWorkflowEvents.DELETED)).toBe(true)
      expect((dispatcher as any).isProductTagEvent("other.event")).toBe(false)
    })
  })

  describe("factory functions", () => {
    describe("tryBuildMailtrapNotificationDispatcher", () => {
      it("should return null if notification service is missing", () => {
        const mailtrapService = {
          listTemplateMappings: jest.fn()
        }

        const container = {
          resolve: jest.fn().mockImplementation((key) => {
            if (key === "mailtrap_plugin" || key === "mailtrapPlugin") return mailtrapService
            if (key === "notification") throw new Error(`Could not resolve '${key}'`)
            throw new Error(`Could not resolve '${key}'`)
          })
        }

        const dispatcher = tryBuildMailtrapNotificationDispatcher(container)

        expect(dispatcher).toBeNull()
      })

      it("should throw if event bus service is missing", () => {
        const mailtrapService = { listTemplateMappings: jest.fn() }
        const notificationService = {}

        const container = {
          resolve: jest.fn().mockImplementation((key, options) => {
            if (key === "mailtrap_plugin" || key === "mailtrapPlugin") return mailtrapService
            if (key === "notification") return notificationService
            if (key === "eventBus") {
              // resolveOptional catches this and returns undefined
              if (options?.allowUnregistered !== undefined) {
                return undefined
              }
              throw new Error(`Could not resolve '${key}'`)
            }
            if (options?.allowUnregistered !== undefined) {
              return undefined
            }
            throw new Error(`Could not resolve '${key}'`)
          })
        }

        expect(() => tryBuildMailtrapNotificationDispatcher(container)).toThrow(
          "Event bus module is not registered"
        )
      })

      it("should throw if mailtrap service is not found", () => {
        const notificationService = {}
        const eventBusService = {}
        const productService = {}

        const container = {
          resolve: jest.fn().mockImplementation((key) => {
            if (key === "notification") return notificationService
            if (key === "eventBus") return eventBusService
            if (key === "product") return productService
            throw new Error(`Could not resolve '${key}'`)
          })
        }

        expect(() => tryBuildMailtrapNotificationDispatcher(container)).toThrow(
          "Mailtrap plugin service is not registered"
        )
      })
    })

    describe("buildMailtrapNotificationDispatcher", () => {
      it("should throw if dispatcher cannot be built", () => {
        const container = {
          resolve: jest.fn().mockImplementation((key) => {
            throw new Error(`Could not resolve '${key}'`)
          })
        }

        expect(() => buildMailtrapNotificationDispatcher(container)).toThrow(
          "Mailtrap plugin service is not registered"
        )
      })
    })
  })
})
