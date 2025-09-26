import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text
} from "@medusajs/ui"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
type MailtrapTemplateMapping = {
  id: string
  notification_handle: string
  template_id: string
  template_name?: string | null
  template_description?: string | null
  template_edit_url?: string | null
  enabled?: boolean
  updated_at?: string | null
}

type MailtrapTemplateSummary = {
  id: string
  uuid?: string | null
  numeric_id?: string | null
  name: string
  description?: string
  updated_at?: string
  edit_url?: string
}

type MailtrapTemplateDefaults = {
  sender: {
    email?: string | null
    name?: string | null
  }
  recipients: string[]
}

type FetchState<T> = {
  data: T
  loading: boolean
  error: string | null
}

type MappingFormState = {
  notificationHandle: string
  templateId: string
  enabled: boolean
  submitting: boolean
  error: string | null
  editingId: string | null
}

type TemplatePreviewState = {
  isOpen: boolean
  loading: boolean
  template: MailtrapTemplateSummary | null
  html: string
  error: string | null
}

type TestEmailState = {
  isOpen: boolean
  template: MailtrapTemplateSummary | null
  to: string
  sending: boolean
  success: string | null
  error: string | null
}

const DEFAULT_NOTIFICATION_HANDLES = [
  "auth.password_reset",
  "cart.created",
  "cart.customer_transferred",
  "cart.customer_updated",
  "cart.region_updated",
  "cart.updated",
  "customer.created",
  "customer.deleted",
  "customer.updated",
  "delivery.created",
  "invite.accepted",
  "invite.created",
  "invite.deleted",
  "invite.resent",
  "order-edit.canceled",
  "order-edit.confirmed",
  "order-edit.requested",
  "order.archived",
  "order.canceled",
  "order.claim_created",
  "order.completed",
  "order.exchange_created",
  "order.fulfillment_canceled",
  "order.fulfillment_created",
  "order.placed",
  "order.return_received",
  "order.return_requested",
  "order.transfer_requested",
  "order.updated",
  "payment.captured",
  "payment.refunded",
  "product-category.created",
  "product-category.deleted",
  "product-category.updated",
  "product-collection.created",
  "product-collection.deleted",
  "product-collection.updated",
  "product-option.created",
  "product-option.deleted",
  "product-option.updated",
  "product-tag.created",
  "product-tag.deleted",
  "product-tag.updated",
  "product-type.created",
  "product-type.deleted",
  "product-type.updated",
  "product-variant.created",
  "product-variant.deleted",
  "product-variant.updated",
  "product.created",
  "product.deleted",
  "product.updated",
  "region.created",
  "region.deleted",
  "region.updated",
  "sales-channel.created",
  "sales-channel.deleted",
  "sales-channel.updated",
  "shipment.created",
  "shipping-option-type.created",
  "shipping-option-type.deleted",
  "shipping-option-type.updated",
  "user.created",
  "user.deleted",
  "user.updated"
]

const NOTIFICATION_HANDLE_DATALIST_ID = "mailtrap-notification-handles"

const createInitialState = <T,>(initialData: T): FetchState<T> => ({
  data: initialData,
  loading: true,
  error: null
})

const createInitialFormState = (): MappingFormState => ({
  notificationHandle: "",
  templateId: "",
  enabled: true,
  submitting: false,
  error: null,
  editingId: null
})

const createInitialPreviewState = (): TemplatePreviewState => ({
  isOpen: false,
  loading: false,
  template: null,
  html: "",
  error: null
})

const createInitialTestEmailState = (): TestEmailState => ({
  isOpen: false,
  template: null,
  to: "",
  sending: false,
  success: null,
  error: null
})

const MailtrapPage = () => {
  const [mappingsState, setMappingsState] = useState(
    createInitialState<MailtrapTemplateMapping[]>([])
  )
  const [templatesState, setTemplatesState] = useState(
    createInitialState<MailtrapTemplateSummary[]>([])
  )
  const [templateDefaults, setTemplateDefaults] = useState<MailtrapTemplateDefaults>({
    sender: {},
    recipients: []
  })
  const [formState, setFormState] = useState<MappingFormState>(createInitialFormState)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingMappingId, setPendingMappingId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<"toggle" | "delete" | null>(null)
  const [previewState, setPreviewState] = useState<TemplatePreviewState>(
    createInitialPreviewState
  )
  const [testEmailState, setTestEmailState] = useState<TestEmailState>(
    createInitialTestEmailState
  )

  const notificationHandleSuggestions = useMemo(
    () => DEFAULT_NOTIFICATION_HANDLES,
    []
  )

  const fetchJson = useCallback(async <T,>(
    url: string,
    init?: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      credentials: init?.credentials ?? "include",
      ...init
    })

    if (!response.ok) {
      let message = `Request to ${url} failed with status ${response.status}`

      try {
        const errorPayload = await response.clone().json()

        if (errorPayload && typeof errorPayload === "object") {
          const payload = errorPayload as Record<string, unknown>

          const fromMessage = typeof payload.message === "string" ? payload.message : null

          const payloadErrors = Array.isArray(payload.errors)
            ? (payload.errors as unknown[])
            : null

          const hasPayloadErrors = Array.isArray(payloadErrors) && payloadErrors.length > 0

          const fromErrors = hasPayloadErrors
            ? (() => {
                const errorsArray = payloadErrors as unknown[]

                const stringEntry = errorsArray.find(
                  (value): value is string => typeof value === "string"
                )

                if (stringEntry) {
                  return stringEntry
                }

                return errorsArray
                  .map(value => {
                    if (typeof value === "object" && value !== null) {
                      const { message: errorMessage } = value as Record<string, unknown>
                      return typeof errorMessage === "string" ? errorMessage : null
                    }

                    return null
                  })
                  .find((value): value is string => typeof value === "string" && value.length > 0)
              })()
            : null

          const errorObject =
            payload.error && typeof payload.error === "object"
              ? (payload.error as Record<string, unknown>)
              : null

          const fromErrorObject = errorObject && typeof errorObject.message === "string"
            ? errorObject.message
            : null

          const fromDetail = typeof payload.detail === "string" ? payload.detail : null

          message =
            fromMessage ??
            fromErrors ??
            fromErrorObject ??
            fromDetail ??
            message
        }
      } catch {
        // Ignore JSON parsing and fall back to the default message
      }

      throw new Error(message)
    }

    return (await response.json()) as T
  }, [])

  const loadData = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {}

      setMappingsState(prev => ({
        ...prev,
        loading: true,
        error: null
      }))

      setTemplatesState(prev => ({
        ...prev,
        loading: true,
        error: null
      }))

      try {
        const [mappingsPayload, templatesPayload] = await Promise.all([
          fetchJson<{ mappings: MailtrapTemplateMapping[] }>(
            "/admin/mailtrap/mappings",
            signal ? { signal } : undefined
          ),
          fetchJson<{
            templates: MailtrapTemplateSummary[]
            defaults?: MailtrapTemplateDefaults
          }>(
            "/admin/mailtrap/templates",
            signal ? { signal } : undefined
          )
        ])

        setMappingsState({
          data: mappingsPayload.mappings ?? [],
          loading: false,
          error: null
        })
        setTemplatesState({
          data: templatesPayload.templates ?? [],
          loading: false,
          error: null
        })

        setTemplateDefaults({
          sender: templatesPayload.defaults?.sender ?? {},
          recipients: templatesPayload.defaults?.recipients ?? []
        })
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name === "AbortError"
        ) {
          return
        }

        const message =
          error instanceof Error ? error.message : "Failed to load Mailtrap data."

        setMappingsState(prev => ({
          ...prev,
          loading: false,
          error: message
        }))
        setTemplatesState(prev => ({
          ...prev,
          loading: false,
          error: message
        }))
      }
    },
    [fetchJson]
  )

  useEffect(() => {
    const controller = new AbortController()

    void loadData({ signal: controller.signal })

    return () => controller.abort()
  }, [loadData])

  const resetForm = useCallback(() => {
    setFormState(createInitialFormState())
  }, [])

  const openCreateForm = useCallback(() => {
    resetForm()
    setActionError(null)
    setIsFormOpen(true)
  }, [resetForm])

  const openCreateFormWithTemplate = useCallback(
    (template: MailtrapTemplateSummary) => {
      setActionError(null)
      setIsFormOpen(true)
      setFormState({
        notificationHandle: "",
        templateId: template.id,
        enabled: true,
        submitting: false,
        error: null,
        editingId: null
      })
    },
    []
  )

  const openEditForm = useCallback((mapping: MailtrapTemplateMapping) => {
    setActionError(null)
    setIsFormOpen(true)
    setFormState({
      notificationHandle: mapping.notification_handle,
      templateId: mapping.template_id,
      enabled: mapping.enabled !== false,
      submitting: false,
      error: null,
      editingId: mapping.id
    })
  }, [])

  const closePreview = useCallback(() => {
    setPreviewState(createInitialPreviewState())
  }, [])

  const openTemplatePreview = useCallback(
    async (template: MailtrapTemplateSummary) => {
      const identifier = template.numeric_id ?? template.id

      if (!identifier) {
        setPreviewState({
          isOpen: true,
          loading: false,
          template,
          html: "",
          error: "Template identifier is missing."
        })
        return
      }

      setPreviewState({
        isOpen: true,
        loading: true,
        template,
        html: "",
        error: null
      })

      try {
        const preview = await fetchJson<{
          template: { html?: string; text?: string }
        }>(`/admin/mailtrap/templates/${identifier}/preview`)

        const htmlContent = preview.template?.html ?? preview.template?.text ?? ""

        setPreviewState(prev => ({
          ...prev,
          loading: false,
          html: htmlContent,
          error: htmlContent ? null : "No HTML content was returned for this template."
        }))
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load template preview."

        setPreviewState(prev => ({
          ...prev,
          loading: false,
          error: message
        }))
      }
    },
    [fetchJson]
  )

  const openTestEmailForm = useCallback(
    (template: MailtrapTemplateSummary) => {
      const suggestedRecipients = templateDefaults.recipients.length
        ? templateDefaults.recipients.join(", ")
        : templateDefaults.sender.email ?? ""

      setTestEmailState({
        isOpen: true,
        template,
        to: suggestedRecipients ?? "",
        sending: false,
        success: null,
        error: null
      })
    },
    [templateDefaults]
  )

  const closeTestEmailForm = useCallback(() => {
    setTestEmailState(createInitialTestEmailState())
  }, [])

  const handleSendTestEmail = useCallback(async () => {
    if (!testEmailState.template) {
      return
    }

    const toValue = testEmailState.to.trim()

    if (!toValue) {
      setTestEmailState(prev => ({
        ...prev,
        error: "Provide at least one recipient email before sending."
      }))
      return
    }

    setTestEmailState(prev => ({
      ...prev,
      sending: true,
      error: null,
      success: null
    }))

    try {
      await fetchJson<{ sent: boolean }>(
        `/admin/mailtrap/templates/${testEmailState.template.id}/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: toValue
          })
        }
      )

      setTestEmailState(prev => ({
        ...prev,
        sending: false,
        success: "Test email sent successfully via Mailtrap."
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send Mailtrap test email."

      setTestEmailState(prev => ({
        ...prev,
        sending: false,
        error: message
      }))
    }
  }, [fetchJson, testEmailState])

  const selectedTemplate = useMemo(() => {
    if (!formState.templateId) {
      return null
    }

    return (
      templatesState.data.find(template => template.id === formState.templateId) ?? null
    )
  }, [formState.templateId, templatesState.data])

  const handleSubmitMapping = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const notificationHandle = formState.notificationHandle.trim()

      if (!notificationHandle) {
        setFormState(prev => ({
          ...prev,
          error: "A notification handle is required."
        }))
        return
      }

      if (!formState.templateId) {
        setFormState(prev => ({
          ...prev,
          error: "Select a Mailtrap template to map."
        }))
        return
      }

      const template = templatesState.data.find(
        candidate => candidate.id === formState.templateId
      )

      setFormState(prev => ({
        ...prev,
        submitting: true,
        error: null
      }))
      setActionError(null)

      try {
        await fetchJson<{ mapping: MailtrapTemplateMapping }>(
          "/admin/mailtrap/mappings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              notification_handle: notificationHandle,
              template_id: formState.templateId,
              template_name: template?.name,
              template_description: template?.description,
              template_edit_url: template?.edit_url,
              enabled: formState.enabled
            })
          }
        )

        await loadData()
        resetForm()
        setIsFormOpen(false)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save template mapping."

        setFormState(prev => ({
          ...prev,
          error: message
        }))
      } finally {
        setFormState(prev => ({
          ...prev,
          submitting: false
        }))
      }
    },
    [fetchJson, formState.enabled, formState.notificationHandle, formState.templateId, loadData, resetForm, templatesState.data]
  )

  const handleToggleMapping = useCallback(
    async (mapping: MailtrapTemplateMapping, nextEnabled: boolean) => {
      const previousEnabled = mapping.enabled !== false

      setMappingsState(prev => ({
        ...prev,
        data: prev.data.map(item =>
          item.id === mapping.id ? { ...item, enabled: nextEnabled } : item
        )
      }))

      setPendingMappingId(mapping.id)
      setPendingAction("toggle")
      setActionError(null)

      try {
        await fetchJson<{ mapping: MailtrapTemplateMapping }>(
          "/admin/mailtrap/mappings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              notification_handle: mapping.notification_handle,
              template_id: mapping.template_id,
              template_name: mapping.template_name,
              template_description: mapping.template_description ?? undefined,
              template_edit_url: mapping.template_edit_url ?? undefined,
              enabled: nextEnabled
            })
          }
        )

        await loadData()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update mapping."

        setActionError(message)
        setMappingsState(prev => ({
          ...prev,
          data: prev.data.map(item =>
            item.id === mapping.id ? { ...item, enabled: previousEnabled } : item
          )
        }))
      } finally {
        setPendingMappingId(null)
        setPendingAction(null)
      }
    },
    [fetchJson, loadData]
  )

  const handleDeleteMapping = useCallback(
    async (mapping: MailtrapTemplateMapping) => {
      if (
        !window.confirm(
          `Delete the Mailtrap mapping for "${mapping.notification_handle}"?`
        )
      ) {
        return
      }

      setPendingMappingId(mapping.id)
      setPendingAction("delete")
      setActionError(null)

      try {
        await fetchJson<{
          id: string
          deleted: boolean
        }>(`/admin/mailtrap/mappings/${mapping.id}`, {
          method: "DELETE"
        })

        await loadData()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete mapping."

        setActionError(message)
      } finally {
        setPendingMappingId(null)
        setPendingAction(null)
      }
    },
    [fetchJson, loadData]
  )

  const renderMappingsList = () => {
    if (mappingsState.loading) {
      return <Text size="small">Loading mappings…</Text>
    }

    if (mappingsState.error) {
      return (
        <Text size="small" className="text-ui-fg-error">
          {mappingsState.error}
        </Text>
      )
    }

    if (!mappingsState.data.length) {
      return (
        <Text size="small" className="text-ui-fg-subtle">
          No Mailtrap mappings have been configured yet.
        </Text>
      )
    }

    return (
      <div className="mt-4 grid gap-3">
        {mappingsState.data.map(mapping => {
          const updatedAt = mapping.updated_at
            ? new Date(mapping.updated_at).toLocaleString()
            : "—"

          const enabled = mapping.enabled !== false

          return (
            <div
              key={mapping.id}
              className="rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text className="font-mono text-xs text-ui-fg-muted">
                    {mapping.notification_handle}
                  </Text>
                  <Heading level="h3" className="mt-1 text-lg">
                    {mapping.template_name ?? mapping.template_id}
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Template ID: {mapping.template_id}
                  </Text>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color={enabled ? "green" : "grey"}>
                    {enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`mailtrap-mapping-toggle-${mapping.id}`}
                      checked={enabled}
                      onCheckedChange={value =>
                        handleToggleMapping(mapping, value === true)
                      }
                      disabled={pendingMappingId === mapping.id && pendingAction !== null}
                    />
                    <Label
                      htmlFor={`mailtrap-mapping-toggle-${mapping.id}`}
                      className="text-sm text-ui-fg-subtle"
                    >
                      {enabled ? "Active" : "Inactive"}
                    </Label>
                  </div>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => openEditForm(mapping)}
                    disabled={pendingMappingId === mapping.id && pendingAction !== null}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => handleDeleteMapping(mapping)}
                    isLoading={
                      pendingMappingId === mapping.id && pendingAction === "delete"
                    }
                    disabled={
                      pendingMappingId === mapping.id && pendingAction !== "delete"
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <Text size="small" className="mt-3 text-ui-fg-muted">
                Last updated: {updatedAt}
              </Text>
            </div>
          )
        })}
      </div>
    )
  }

  const renderForm = () => {
    if (!isFormOpen) {
      return null
    }

    return (
      <form
        className="mt-4 space-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-4"
        onSubmit={handleSubmitMapping}
      >
        {formState.editingId ? (
          <Text size="small" className="text-ui-fg-muted">
            Editing mapping for <span className="font-mono">{formState.notificationHandle}</span>. Notification handles cannot be changed.
          </Text>
        ) : null}

        <div className="grid gap-1">
          <Label htmlFor="mailtrap-notification-handle">Notification handle</Label>
          <Input
            id="mailtrap-notification-handle"
            list={NOTIFICATION_HANDLE_DATALIST_ID}
            value={formState.notificationHandle}
            onChange={event =>
              setFormState(prev => ({
                ...prev,
                notificationHandle: event.target.value
              }))
            }
            placeholder="e.g. order.shipped"
            disabled={formState.submitting || !!formState.editingId}
            required
          />
          <datalist id={NOTIFICATION_HANDLE_DATALIST_ID}>
            {notificationHandleSuggestions.map(handle => (
              <option key={handle} value={handle} />
            ))}
          </datalist>
          {!formState.editingId ? (
            <Text size="small" className="text-ui-fg-muted">
              Choose a core workflow event handle or type a custom value.
            </Text>
          ) : null}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="mailtrap-template-select">Mailtrap template</Label>
          <Select
            value={formState.templateId}
            onValueChange={value =>
              setFormState(prev => ({
                ...prev,
                templateId: value
              }))
            }
            disabled={
              formState.submitting ||
              templatesState.loading ||
              templatesState.data.length === 0
            }
          >
            <Select.Trigger id="mailtrap-template-select">
              <Select.Value
                placeholder={
                  templatesState.loading
                    ? "Loading templates"
                    : "Select a Mailtrap template"
                }
              />
            </Select.Trigger>
            <Select.Content>
              {templatesState.data.map(template => (
                <Select.Item key={template.id} value={template.id}>
                  {template.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {selectedTemplate ? (
          <div className="rounded-md bg-ui-bg-subtle px-3 py-2">
            <Text size="small" className="font-medium">
              {selectedTemplate.name}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {selectedTemplate.id}
            </Text>
            {selectedTemplate.description ? (
              <Text size="small" className="mt-2 text-ui-fg-muted">
                {selectedTemplate.description}
              </Text>
            ) : null}
            {selectedTemplate.updated_at ? (
              <Text size="small" className="mt-2 text-ui-fg-muted">
                Last updated {new Date(selectedTemplate.updated_at).toLocaleString()}
              </Text>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Switch
            id="mailtrap-mapping-enabled"
            checked={formState.enabled}
            onCheckedChange={value =>
              setFormState(prev => ({
                ...prev,
                enabled: value === true
              }))
            }
            disabled={formState.submitting}
          />
          <Label htmlFor="mailtrap-mapping-enabled">Mapping active</Label>
        </div>

        {formState.error ? (
          <Text size="small" className="text-ui-fg-error">
            {formState.error}
          </Text>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetForm()
              setIsFormOpen(false)
            }}
            disabled={formState.submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={formState.submitting}
          >
            {formState.editingId ? "Save changes" : "Create mapping"}
          </Button>
        </div>
      </form>
    )
  }

  const renderTemplates = () => {
    if (templatesState.loading) {
      return <Text size="small">Loading templates…</Text>
    }

    if (templatesState.error) {
      return (
        <Text size="small" className="text-ui-fg-error">
          {templatesState.error}
        </Text>
      )
    }

    if (!templatesState.data.length) {
      return (
        <Text size="small" className="text-ui-fg-subtle">
          No templates were returned from Mailtrap.
        </Text>
      )
    }

    return (
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {templatesState.data.map(template => {
          const updatedAt = template.updated_at
            ? new Date(template.updated_at).toLocaleString()
            : null

          return (
            <div
              key={template.id}
              className="rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3"
            >
              <Heading level="h3" className="text-lg">
                {template.name}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {template.id}
              </Text>
              {template.description ? (
                <Text size="small" className="mt-2 text-ui-fg-muted">
                  {template.description}
                </Text>
              ) : null}
              {updatedAt ? (
                <Text size="small" className="mt-2 text-ui-fg-muted">
                  Updated {updatedAt}
                </Text>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => openCreateFormWithTemplate(template)}
                >
                  Assign to notification
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => openTemplatePreview(template)}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => openTestEmailForm(template)}
                >
                  Send test email
                </Button>
                {template.edit_url ? (
                  <Button size="small" variant="transparent" asChild>
                    <a href={template.edit_url} target="_blank" rel="noreferrer">
                      Open in Mailtrap
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTemplatePreview = () => {
    if (!previewState.isOpen || !previewState.template) {
      return null
    }

    const { template, loading, error, html } = previewState

    return (
      <section className="space-y-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Heading level="h3" className="text-base">
              Preview: {template.name}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Template UUID: {template.uuid ?? template.id}
            </Text>
          </div>
          <Button size="small" variant="secondary" onClick={closePreview}>
            Close preview
          </Button>
        </div>

        {loading ? (
          <Text size="small">Loading preview…</Text>
        ) : error ? (
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        ) : (
          <div className="h-[500px] overflow-hidden rounded-md border border-ui-border-base">
            <iframe
              title={`Mailtrap preview for ${template.name}`}
              srcDoc={html}
              className="h-full w-full bg-white"
              sandbox=""
            />
          </div>
        )}
      </section>
    )
  }

  const renderTestEmailForm = () => {
    if (!testEmailState.isOpen || !testEmailState.template) {
      return null
    }

    return (
      <section className="space-y-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Heading level="h3" className="text-base">
              Send test email: {testEmailState.template.name}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Using template UUID {testEmailState.template.uuid ?? testEmailState.template.id}
            </Text>
          </div>
          <Button size="small" variant="secondary" onClick={closeTestEmailForm}>
            Close
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mailtrap-test-email-to">Recipient emails</Label>
          <Input
            id="mailtrap-test-email-to"
            value={testEmailState.to}
            placeholder="Enter comma-separated test recipient emails"
            onChange={event =>
              setTestEmailState(prev => ({
                ...prev,
                to: event.target.value
              }))
            }
            disabled={testEmailState.sending}
          />
          <Text size="xsmall" className="text-ui-fg-muted">
            Default recipients: {templateDefaults.recipients.length
              ? templateDefaults.recipients.join(", ")
              : templateDefaults.sender.email ?? "Not configured"}
          </Text>
        </div>

        {testEmailState.error ? (
          <Text size="small" className="text-ui-fg-error">
            {testEmailState.error}
          </Text>
        ) : null}

        {testEmailState.success ? (
          <Text size="small" className="text-ui-fg-positive">
            {testEmailState.success}
          </Text>
        ) : null}

        <div className="flex justify-end">
          <Button
            size="small"
            variant="primary"
            onClick={() => void handleSendTestEmail()}
            isLoading={testEmailState.sending}
          >
            Send test email
          </Button>
        </div>
      </section>
    )
  }

  return (
    <Container className="divide-y p-0">
      <header className="flex flex-col gap-y-2 px-6 py-4">
        <Heading level="h2">Mailtrap Notifications</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Review and manage your Mailtrap template mappings used for transactional
          notifications.
        </Text>
      </header>

      <section className="space-y-4 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level="h3" className="text-base">
            Configured mappings
          </Heading>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant={isFormOpen ? "secondary" : "primary"}
              onClick={() => {
                if (isFormOpen) {
                  resetForm()
                  setIsFormOpen(false)
                } else {
                  openCreateForm()
                }
              }}
            >
              {isFormOpen ? "Close form" : "New mapping"}
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => void loadData()}
              disabled={mappingsState.loading || templatesState.loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {actionError ? (
          <Text size="small" className="text-ui-fg-error">
            {actionError}
          </Text>
        ) : null}

        {renderForm()}
        {renderMappingsList()}
      </section>

      <section className="space-y-4 px-6 py-4">
        <Heading level="h3" className="text-base">
          Mailtrap templates
        </Heading>
        {renderTemplates()}
      </section>

      {renderTemplatePreview()}
      {renderTestEmailForm()}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Mailtrap Notifications",
  icon: ChatBubbleLeftRight
})

export default MailtrapPage
