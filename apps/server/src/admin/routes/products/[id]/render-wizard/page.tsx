import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo } from "@medusajs/icons"
import { Container, Heading, Button, Text } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useState } from "react"
import { RenderWizardModal } from "./components/render-wizard-modal"
import { RenderHistory } from "./components/render-history"

/**
 * Render Wizard Page
 *
 * Admin page for generating product renders using the T-Shirt Render Engine.
 * Provides access to the render wizard modal for creating new render jobs.
 */
const RenderWizardPage = () => {
  const { id: productId } = useParams<{ id: string }>()
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  if (!productId) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Error: Product Not Found</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            No product ID was provided. Please navigate to this page from a product detail page.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Container className="divide-y p-0">
        <header className="flex flex-col gap-y-2 px-6 py-4">
          <Heading level="h2">Product Render Engine</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Generate high-quality product renders with custom designs
          </Text>
        </header>

        <section className="px-6 py-4 space-y-6">
          <div className="space-y-4">
            <Heading level="h3" className="text-base">
              Create New Render
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Upload a design and generate photorealistic product renders automatically.
              The wizard will guide you through uploading your design, selecting the
              placement position, and monitoring the render progress.
            </Text>

            <div className="flex gap-x-2">
              <Button
                variant="primary"
                onClick={() => setIsWizardOpen(true)}
                aria-label="Open render wizard to create new render job"
              >
                Start Render Wizard
              </Button>
            </div>
          </div>

          <div className="border-t border-ui-border-base pt-6 space-y-4">
            <Heading level="h3" className="text-base">
              Features
            </Heading>
            <ul className="list-disc list-inside space-y-2 text-sm text-ui-fg-subtle">
              <li>Upload PNG, JPG, or SVG design files (up to 10MB)</li>
              <li>Choose from preset design positions</li>
              <li>Automatic Blender rendering with customizable options</li>
              <li>Real-time progress tracking</li>
              <li>Automatic media library integration</li>
            </ul>
          </div>

        </section>
      </Container>

      {/* Render History */}
      <div className="mt-6">
        <RenderHistory
          productId={productId}
          pageSize={10}
          showRefreshButton={true}
          onRetry={(jobId) => {
            console.log("Retried job:", jobId)
          }}
        />
      </div>

      {/* Render Wizard Modal */}
      <RenderWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        productId={productId}
        onRenderComplete={() => {
          // Callback when render is completed
          // This can be used to refresh the render history or show a success message
          console.log("Render completed for product:", productId)
        }}
      />
    </>
  )
}

export const config = defineRouteConfig({
  label: "Render Wizard",
  icon: Photo,
})

export default RenderWizardPage
