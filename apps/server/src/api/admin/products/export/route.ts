import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { exportProductsWorkflow } from "../../../../workflows/product/export-products"

/**
 * Custom product export endpoint that uses the fixed workflow.
 *
 * This endpoint triggers the custom-export-products workflow which sets
 * access: "public" on exported files to prevent 404 errors caused by
 * duplicate timestamp prefixes.
 *
 * Unlike the default Medusa export endpoint, this endpoint executes
 * synchronously and returns the file information directly in the response.
 *
 * @route POST /admin/products/export
 * @access Admin
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Extract filters from query params or request body
    const { filters = {}, select = ["*"] } = req.body || {}

    console.log("[Product Export] Starting export with filters:", filters)

    // Execute the custom export workflow (synchronous execution)
    const { result, transaction } = await exportProductsWorkflow(req.scope).run({
      input: {
        select,
        filters,
      },
    })

    console.log("[Product Export] Workflow completed successfully", {
      transactionId: transaction?.transactionId,
      fileId: result?.file?.id,
      filename: result?.file?.filename,
      url: result?.fileDetails?.url,
    })

    // Return success with file details
    return res.status(200).json({
      message: "Product export completed successfully",
      file: {
        id: result?.file?.id,
        filename: result?.file?.filename,
        url: result?.fileDetails?.url,
        mimeType: "text/csv",
      },
      transaction_id: transaction?.transactionId,
    })
  } catch (error) {
    console.error("[Product Export] Error:", error)

    return res.status(500).json({
      message: "Failed to export products",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
