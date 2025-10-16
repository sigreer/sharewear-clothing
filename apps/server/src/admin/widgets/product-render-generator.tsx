import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Button, Text, toast } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RenderWizardModal } from "../routes/products/[id]/render-wizard/components/render-wizard-modal"

/**
 * Product Render Generator Widget
 *
 * Injects a "Generate Render" button into the product details page
 * that opens the render wizard modal for creating product renders.
 *
 * Features:
 * - One-click access to render wizard from product media section
 * - Automatic media refresh after successful render
 * - Toast notifications for user feedback
 * - Accessible button with icon
 *
 * Injection Zone: product.details.side.after
 * (Appears in the side column after existing product information)
 */
const ProductRenderGeneratorWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const queryClient = useQueryClient()

  /**
   * Handle successful render completion
   * - Close wizard
   * - Invalidate product queries to refresh media
   * - Show success notification
   */
  const handleRenderComplete = useCallback(async () => {
    setIsWizardOpen(false)

    // Invalidate product queries to refresh media list
    await queryClient.invalidateQueries({
      queryKey: ["product", product.id],
    })

    // Show success notification
    toast.success("Render Generated", {
      description: "Your product render has been generated successfully and added to the media library.",
      duration: 5000,
    })
  }, [product.id, queryClient])

  /**
   * Handle opening the wizard
   */
  const handleOpenWizard = useCallback(() => {
    setIsWizardOpen(true)
  }, [])

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">Product Renders</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Generate photorealistic product images
            </Text>
          </div>
        </div>

        <div className="px-6 py-4">
          <Button
            variant="secondary"
            onClick={handleOpenWizard}
            className="w-full"
            aria-label="Open render wizard to generate product renders"
          >
            <Sparkles />
            Generate Render
          </Button>

          <Text size="xsmall" className="text-ui-fg-subtle mt-2 block">
            Upload a design and create renders automatically
          </Text>
        </div>
      </Container>

      {/* Render Wizard Modal */}
      <RenderWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        productId={product.id}
        onRenderComplete={handleRenderComplete}
      />
    </>
  )
}

/**
 * Widget Configuration
 * Injects into the side column of the product details page
 */
export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductRenderGeneratorWidget
