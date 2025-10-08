import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { WorkflowTypes } from "@medusajs/framework/types"
import {
  getAllProductsStep,
  useRemoteQueryStep,
} from "@medusajs/core-flows"
import { generateProductCsvStep } from "./steps/generate-product-csv"

export const exportProductsWorkflowId = "custom-export-products"

/**
 * Custom export products workflow that fixes the file not found issue.
 *
 * This workflow uses a custom workflow ID to avoid conflicts with the core
 * Medusa export-products workflow. It includes a custom generateProductCsvStep
 * that sets access: "public" on exported files.
 *
 * **Issue Fixed**: Duplicate timestamp prefixes causing 404 errors when
 * downloading exported product CSV files.
 *
 * **Implementation Note**: This workflow does not use admin UI notifications
 * (feed channel) to avoid requiring a notification provider configuration.
 * Instead, it returns file details directly for the API to handle.
 *
 * @example
 * To export all products:
 *
 * ```ts
 * const { result } = await exportProductsWorkflow(container)
 * .run({
 *   input: {
 *     select: ["*"],
 *   }
 * })
 * ```
 *
 * To export products matching a criteria:
 *
 * ```ts
 * const { result } = await exportProductsWorkflow(container)
 * .run({
 *   input: {
 *     select: ["*"],
 *     filter: {
 *       collection_id: "pcol_123"
 *     }
 *   }
 * })
 * ```
 *
 * @summary
 *
 * Export products with filtering capabilities (custom implementation with fixed file access).
 */
export const exportProductsWorkflow = createWorkflow(
  exportProductsWorkflowId,
  (input: WorkflowTypes.ProductWorkflow.ExportProductsDTO) => {
    // Get all products matching the filters
    const products = getAllProductsStep(input)

    // Use our custom step that sets access: "public" to prevent duplicate timestamp prefix
    const file = generateProductCsvStep(products)

    // Get file details including the URL
    const fileDetails = useRemoteQueryStep({
      fields: ["id", "url"],
      entry_point: "file",
      variables: { id: file.id },
      list: false,
    })

    // Return file information for the API endpoint to use
    return { file, fileDetails }
  }
)
