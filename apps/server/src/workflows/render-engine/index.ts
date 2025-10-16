/**
 * Render Engine Workflows
 *
 * Exports the main render workflow (simplified single-step version).
 * Individual workflow steps are also available for advanced use cases.
 */

// Main workflow (recommended - simplified version)
export {
  createRenderSimpleWorkflow,
  createRenderSimpleWorkflowId
} from "./create-render-simple"

// Alternative multi-step workflow (advanced)
// NOTE: This workflow has TypeScript issues with transform chains
// Use the simple workflow above instead
// export {
//   createRenderWorkflow,
//   createRenderWorkflowId
// } from "./create-render-workflow"

// Individual workflow steps (for advanced composition)
export { createRenderJobStep, createRenderJobStepId } from "./steps/create-render-job-step"
export { uploadDesignFileStep, uploadDesignFileStepId } from "./steps/upload-design-file-step"
export { composeDesignStep, composeDesignStepId } from "./steps/compose-design-step"
export { renderDesignStep, renderDesignStepId } from "./steps/render-design-step"
export { storeRenderOutputsStep, storeRenderOutputsStepId } from "./steps/store-render-outputs-step"
export { associateProductMediaStep, associateProductMediaStepId } from "./steps/associate-product-media-step"
export { completeRenderJobStep, completeRenderJobStepId } from "./steps/complete-render-job-step"

// Workflow types
export type {
  CreateRenderWorkflowInput,
  CreateRenderWorkflowOutput,
  CreateRenderJobStepInput,
  CreateRenderJobStepOutput,
  UploadDesignFileStepInput,
  UploadDesignFileStepOutput,
  ComposeDesignStepInput,
  ComposeDesignStepOutput,
  RenderDesignStepInput,
  RenderDesignStepOutput,
  StoreRenderOutputsStepInput,
  StoreRenderOutputsStepOutput,
  AssociateProductMediaStepInput,
  AssociateProductMediaStepOutput,
  CompleteRenderJobStepInput,
  CompleteRenderJobStepOutput
} from "./types"
