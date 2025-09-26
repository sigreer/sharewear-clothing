import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ProductTagWorkflowEvents } from "@medusajs/framework/utils"
import MailtrapPluginService from "../../src/modules/mailtrap-plugin/service"

const mockMailtrapClient = {
  templates: {
    getList: jest.fn(),
    get: jest.fn()
  },
  send: jest.fn()
}

const buildClientSpy = jest
  .spyOn(MailtrapPluginService.prototype as any, "buildMailtrapClient")
  .mockImplementation(function () {
    return mockMailtrapClient as any
  })

const resetMailtrapMocks = () => {
  mockMailtrapClient.templates.getList.mockResolvedValue([
    {
      id: 101,
      uuid: "test-template-uuid",
      name: "Test Template",
      subject: "Hello",
      description: "Test template",
      updated_at: new Date("2024-01-01T00:00:00.000Z").toISOString(),
      body_html: "<h1>Preview</h1>"
    }
  ])

  mockMailtrapClient.templates.get.mockResolvedValue({
    id: 101,
    uuid: "test-template-uuid",
    name: "Test Template",
    subject: "Hello",
    body_html: "<h1>Preview HTML</h1>",
    body_text: "Preview text"
  })

  mockMailtrapClient.send.mockResolvedValue({
    success: true,
    message_ids: ["mock-message"]
  })
}

medusaIntegrationTestRunner({
  env: {
    MAILTRAP_API_TOKEN: "test-token",
    MAILTRAP_ACCOUNT_ID: "123",
    MAILTRAP_SENDER_EMAIL: "from@example.com",
    MAILTRAP_SENDER_NAME: "Test Sender",
    MAILTRAP_DEFAULT_RECIPIENTS: "recipient@example.com"
  },
  testSuite: ({ api, getContainer }) => {
    describe("Mailtrap admin endpoints", () => {
      beforeEach(() => {
        resetMailtrapMocks()
        mockMailtrapClient.templates.getList.mockClear()
        mockMailtrapClient.templates.get.mockClear()
        mockMailtrapClient.send.mockClear()
      })

      afterAll(() => {
        buildClientSpy.mockRestore()
      })

      it("returns templates with defaults", async () => {
        const response = await api.get("/admin/mailtrap/templates")

        expect(response.status).toEqual(200)
        expect(response.data.templates).toHaveLength(1)
        expect(response.data.defaults.sender.email).toEqual("from@example.com")
        expect(response.data.defaults.recipients).toEqual(["recipient@example.com"])
      })

      it("returns template preview html", async () => {
        const response = await api.get("/admin/mailtrap/templates/101/preview")

        expect(response.status).toEqual(200)
        expect(response.data.template.html).toContain("<h1>Preview HTML</h1>")
      })

      it("sends a test email using the Mailtrap client", async () => {
        const response = await api.post(
          "/admin/mailtrap/templates/test-template-uuid/test",
          {
            to: "preview@example.com"
          }
        )

        expect(response.status).toEqual(200)
        expect(response.data.sent).toBeTruthy()
        expect(mockMailtrapClient.send).toHaveBeenCalledTimes(1)
        const call = mockMailtrapClient.send.mock.calls[0][0]
        expect(call.template_uuid).toEqual("test-template-uuid")
        expect(call.to[0].email).toEqual("preview@example.com")
      })

      it("dispatches Mailtrap notifications when an event is emitted", async () => {
        const mappingResponse = await api.post("/admin/mailtrap/mappings", {
          notification_handle: ProductTagWorkflowEvents.CREATED,
          template_id: "test-template-uuid",
          enabled: true
        })

        expect(mappingResponse.status).toEqual(200)

        const container = getContainer()
        const eventBus = container.resolve(Modules.EVENT_BUS)

        await eventBus.emit({
          name: ProductTagWorkflowEvents.CREATED,
          data: {
            id: "tag_test_id",
            to: "recipient@example.com"
          }
        })

        // Allow async subscribers to process the event
        await new Promise(resolve => setTimeout(resolve, 20))

        expect(mockMailtrapClient.send).toHaveBeenCalled()
      })
    })
  }
})
