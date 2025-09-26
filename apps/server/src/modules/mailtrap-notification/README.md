# Mailtrap Notification Provider for Medusa

This module registers the Mailtrap notification provider used by Medusa's notification module. It works together with the [`mailtrap-plugin`](../mailtrap-plugin/README.md) module, which supplies the shared service, template mappings, and event dispatcher. Keep both modules in place: the plugin module handles persistence + API concerns, while this provider focuses solely on the notification contract.

## Features

- Send HTML and text emails
- Template-based email sending using Mailtrap templates
- Support for multiple recipients
- Configurable sender information
- Fallback to plugin-level default recipients when notifications omit explicit addresses
- Comprehensive error handling and logging

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
MAILTRAP_API_TOKEN=your_mailtrap_api_token_here
MAILTRAP_SENDER_EMAIL=noreply@yourdomain.com
MAILTRAP_SENDER_NAME=Your Store Name
```

### Medusa Configuration

The provider is automatically registered in `medusa-config.ts`:

```typescript
modules: [
  {
    resolve: "./src/modules/mailtrap-notification",
    options: {
      providers: [
        {
          resolve: "./src/modules/mailtrap-notification/services/mailtrap-notification-provider",
          id: "mailtrap-notification",
          options: {
            token: process.env.MAILTRAP_API_TOKEN!,
            sender_email: process.env.MAILTRAP_SENDER_EMAIL!,
            sender_name: process.env.MAILTRAP_SENDER_NAME || "Medusa Store"
          }
        }
      ]
    }
  }
]
```

## Usage

### Basic Email Sending

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const notificationService = req.scope.resolve("notificationService")

  await notificationService.createNotifications({
    to: "customer@example.com",
    channel: "email",
    template: "order-confirmation",
    data: {
      subject: "Order Confirmation",
      html: "<h1>Thank you for your order!</h1>",
      // or use text instead of html
      // text: "Thank you for your order!"
    }
  })

  res.json({ message: "Notification sent" })
}
```

### Template-Based Emails

If you have templates configured in Mailtrap:

```typescript
await notificationService.createNotifications({
  to: "customer@example.com",
  channel: "email",
  template: "order-confirmation",
  data: {
    subject: "Order Confirmation",
    template_uuid: "your-mailtrap-template-uuid",
    template_variables: {
      customer_name: "John Doe",
      order_number: "ORD-123456",
      order_total: "$99.99"
    }
  }
})
```

### Multiple Recipients

```typescript
await notificationService.createNotifications({
  to: ["customer1@example.com", "customer2@example.com"],
  channel: "email",
  template: "newsletter",
  data: {
    subject: "Monthly Newsletter",
    html: "<h1>This month's updates...</h1>"
  }
})
```

### Custom Sender

```typescript
await notificationService.createNotifications({
  to: "customer@example.com",
  channel: "email",
  template: "support-response",
  data: {
    subject: "Support Response",
    html: "<p>Thank you for contacting support...</p>",
    from: {
      email: "support@yourdomain.com",
      name: "Support Team"
    }
  }
})
```

## Integration with Medusa Workflows

You can use this notification provider in custom workflows:

```typescript
import { createStep, createWorkflow, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createNotificationsStep } from "@medusajs/medusa/core-flows"

const sendOrderConfirmationStep = createStep(
  "send-order-confirmation",
  async (input: { order_id: string; customer_email: string }, { container }) => {
    const notificationService = container.resolve("notificationService")

    await notificationService.createNotifications({
      to: input.customer_email,
      channel: "email",
      template: "order-confirmation",
      data: {
        subject: `Order Confirmation - ${input.order_id}`,
        html: `<h1>Your order ${input.order_id} has been confirmed!</h1>`
      }
    })

    return new StepResponse({ success: true })
  }
)

export const orderConfirmationWorkflow = createWorkflow(
  "order-confirmation",
  (input: { order_id: string; customer_email: string }) => {
    sendOrderConfirmationStep(input)
  }
)
```

## Error Handling

The provider includes comprehensive error handling and logging. Failed email sends will be logged with detailed error information, and the notification service will receive appropriate success/failure responses.

## Development and Testing

Mailtrap provides excellent testing capabilities through their sandbox environment, making it perfect for development and staging environments before switching to production email sending.

## Requirements

- Medusa v2
- Mailtrap account and API token
- Verified sending domain (for production use)
