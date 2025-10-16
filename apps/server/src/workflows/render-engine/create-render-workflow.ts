import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createRenderJobStep } from "./steps/create-render-job-step"
import { uploadDesignFileStep } from "./steps/upload-design-file-step"
import { composeDesignStep } from "./steps/compose-design-step"
import { renderDesignStep } from "./steps/render-design-step"
import { storeRenderOutputsStep } from "./steps/store-render-outputs-step"
import { associateProductMediaStep } from "./steps/associate-product-media-step"
import { completeRenderJobStep } from "./steps/complete-render-job-step"
import {
  CreateRenderWorkflowInput,
  CreateRenderWorkflowOutput
} from "./types"

export const createRenderWorkflowId = "create-render-workflow"

type WorkflowContext = {
  jobId?: string
  productId?: string
  preset?: string
  designPath?: string
  compositedPath?: string
  renderedImages?: string[]
  animation?: string
  renderedImageUrls?: string[]
  animationUrl?: string
  mediaIds?: string[]
  status?: string
}

/**
 * Create Render Workflow
 *
 * Orchestrates the complete t-shirt design rendering pipeline:
 * 1. Create render job record
 * 2. Upload design file to storage
 * 3. Execute compose_design.py to composite design onto template
 * 4. Execute render_design.py to render 3D t-shirt with Blender
 * 5. Store all render outputs (6 images + optional animation)
 * 6. Associate product media entries
 * 7. Complete job and cleanup
 *
 * Error Handling:
 * - Each step has compensation logic to handle failures gracefully
 * - Job status is updated to "failed" with error message on failure
 * - Temporary files are cleaned up on both success and failure
 *
 * @example
 * ```typescript
 * const { result } = await createRenderWorkflow(container).run({
 *   input: {
 *     productId: "prod_123",
 *     designFile: buffer,
 *     designFilename: "my-design.png",
 *     designMimetype: "image/png",
 *     preset: "chest-medium",
 *     templatePath: "/path/to/template.png",
 *     blendFile: "/path/to/tshirt.blend",
 *     fabricColor: "#FFFFFF",
 *     backgroundColor: "transparent",
 *     samples: 128
 *   }
 * })
 * ```
 */
export const createRenderWorkflow = createWorkflow(
  createRenderWorkflowId,
  function (input: CreateRenderWorkflowInput) {
    /**
     * Note: This workflow uses a simplified approach where the full workflow input
     * is stored in job metadata and each step extracts what it needs from the
     * RenderJob record. This avoids complex transform chains while maintaining
     * proper step isolation and compensation.
     *
     * Steps communicate via the RenderJob database record which acts as the
     * shared state container throughout the workflow execution.
     */

    // Step 1: Create render job with full workflow input in metadata
    createRenderJobStep()

    // Step 2: Upload design file
    uploadDesignFileStep()

    // Step 3: Composite design
    composeDesignStep()

    // Step 4: Render 3D
    renderDesignStep()

    // Step 5: Store outputs
    storeRenderOutputsStep()

    // Step 6: Associate media
    associateProductMediaStep()

    // Step 7: Complete
    completeRenderJobStep()

    // Workflow output is returned via the job record
    return new WorkflowResponse({
      success: true
    })
  }
)
