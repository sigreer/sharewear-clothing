import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/framework/types"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import MediaAssociationService from "../../../modules/render-engine/services/media-association-service"
import {
  AssociateProductMediaStepInput,
  AssociateProductMediaStepOutput
} from "../types"

export const associateProductMediaStepId = "associate-product-media-step"

/**
 * Step 6: Associate Product Media
 *
 * Creates product media entries for all rendered images and associates them
 * with the product. Sets the front_0deg view as the product thumbnail.
 *
 * @param input - Product and media URLs
 * @returns Array of created media IDs
 */
export const associateProductMediaStep = createStep(
  associateProductMediaStepId,
  async (input: AssociateProductMediaStepInput, { container }) => {
    const mediaAssociationService: MediaAssociationService = container.resolve(RENDER_ENGINE_MODULE)
    const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)

    // Associate all render outputs with the product
    const mediaIds = await mediaAssociationService.associateRenderOutputs(
      input.jobId,
      input.productId,
      {
        renderedImages: [], // Not used in current implementation
        renderedImageUrls: input.renderedImageUrls,
        animation: input.animationUrl ? "animation" : undefined,
        animationUrl: input.animationUrl
      },
      input.preset,
      { productModuleService }
    )

    return new StepResponse<AssociateProductMediaStepOutput>(
      {
        mediaIds
      },
      {
        jobId: input.jobId,
        productId: input.productId,
        mediaIds
      } // Compensation data
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData) {
      return
    }

    // Compensation: Remove created media entries if workflow fails
    const { jobId, productId } = compensationData
    const mediaAssociationService: MediaAssociationService = container.resolve(RENDER_ENGINE_MODULE)
    const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)

    try {
      await mediaAssociationService.removeMediaByJob(
        jobId,
        productId,
        { productModuleService }
      )
    } catch (error) {
      console.error(`Failed to remove media for job ${jobId} during compensation:`, error)
    }
  }
)
