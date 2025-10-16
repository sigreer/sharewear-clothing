import { MedusaError } from "@medusajs/framework/utils"
import { IProductModuleService, Logger, ProductImageDTO } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Camera angle mapping for render outputs
 * Maps camera angle names to display order and metadata
 */
const CAMERA_ANGLES = [
  { name: "front_0deg", order: 0, description: "Front view" },
  { name: "left_90deg", order: 1, description: "Left side view" },
  { name: "right_270deg", order: 2, description: "Right side view" },
  { name: "back_180deg", order: 3, description: "Back view" },
  { name: "front_45deg_left", order: 4, description: "Front-left angle" },
  { name: "front_45deg_right", order: 5, description: "Front-right angle" }
] as const

type CameraAngleName = typeof CAMERA_ANGLES[number]["name"]

/**
 * Media metadata stored with each product image
 */
export type MediaMetadata = {
  generated_by: "render-engine"
  render_job_id: string
  camera_angle?: string
  preset: string
  created_at: string
  media_type: "image" | "video"
}

/**
 * Render output files and URLs
 */
export type RenderOutputs = {
  /** Array of 6 rendered image file paths */
  renderedImages: string[]
  /** Array of 6 public URLs for rendered images */
  renderedImageUrls: string[]
  /** Optional animation file path */
  animation?: string
  /** Optional animation public URL */
  animationUrl?: string
}

/**
 * Product media entry with render metadata
 */
export type ProductMediaWithMetadata = ProductImageDTO & {
  metadata: MediaMetadata
}

type InjectedDependencies = {
  logger: Logger
}

/**
 * Media Association Service
 *
 * Manages the association of rendered images with product media entries in Medusa.
 * After the render workflow completes, this service creates product media entries
 * and associates them with the correct product.
 *
 * @service
 */
export default class MediaAssociationService {
  protected readonly logger_: Logger

  constructor(dependencies: InjectedDependencies) {
    this.logger_ = dependencies.logger
  }

  /**
   * Create product media entries for all render outputs
   *
   * @param jobId - RenderJob ID
   * @param productId - Product ID to associate media with
   * @param outputs - Paths and URLs of rendered images
   * @param preset - Render preset used for this job
   * @returns Array of created media IDs
   * @throws {MedusaError} If validation fails or product not found
   */
  async associateRenderOutputs(
    jobId: string,
    productId: string,
    outputs: RenderOutputs,
    preset: string,
    { productModuleService }: { productModuleService: IProductModuleService }
  ): Promise<string[]> {
    // Validate inputs
    this.validateJobId(jobId)
    this.validateProductId(productId)
    this.validateRenderOutputs(outputs)

    // Verify product exists
    const product = await this.getProduct(productId, productModuleService)
    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product with ID ${productId} not found`
      )
    }

    const createdMediaIds: string[] = []

    try {
      // Create media entries for each camera angle (6 images)
      for (let i = 0; i < outputs.renderedImageUrls.length; i++) {
        const imageUrl = outputs.renderedImageUrls[i]
        const cameraAngle = CAMERA_ANGLES[i]

        if (!imageUrl || !cameraAngle) {
          this.logger_.warn(
            `Skipping invalid image at index ${i} for job ${jobId}`
          )
          continue
        }

        const mediaId = await this.createProductMedia(
          productId,
          imageUrl,
          {
            job_id: jobId,
            camera_angle: cameraAngle.name,
            media_type: "image",
            render_preset: preset
          },
          { productModuleService }
        )

        createdMediaIds.push(mediaId)

        this.logger_.info(
          `Created media ${mediaId} for product ${productId} - ${cameraAngle.description}`
        )
      }

      // Create media entry for animation if present
      if (outputs.animationUrl) {
        const animationId = await this.createProductMedia(
          productId,
          outputs.animationUrl,
          {
            job_id: jobId,
            media_type: "video",
            render_preset: preset
          },
          { productModuleService }
        )

        createdMediaIds.push(animationId)

        this.logger_.info(
          `Created animation media ${animationId} for product ${productId}`
        )
      }

      // Set the front_0deg image as product thumbnail
      if (outputs.renderedImageUrls.length > 0) {
        await this.setProductThumbnail(
          productId,
          outputs.renderedImageUrls[0],
          { productModuleService }
        )
      }

      this.logger_.info(
        `Successfully associated ${createdMediaIds.length} media entries with product ${productId} for job ${jobId}`
      )

      return createdMediaIds
    } catch (error) {
      this.logger_.error(
        `Failed to associate render outputs for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Create a single product media entry
   *
   * @param productId - Product ID
   * @param fileUrl - Public URL of the media file
   * @param metadata - Additional metadata (job_id, camera_angle, etc.)
   * @returns Created media ID
   * @throws {MedusaError} If creation fails
   */
  async createProductMedia(
    productId: string,
    fileUrl: string,
    metadata: {
      job_id: string
      camera_angle?: string
      media_type: "image" | "video"
      render_preset: string
    },
    { productModuleService }: { productModuleService: IProductModuleService }
  ): Promise<string> {
    // Validate inputs
    this.validateProductId(productId)
    this.validateFileUrl(fileUrl)

    if (!metadata.job_id || !metadata.render_preset) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "job_id and render_preset are required in metadata"
      )
    }

    try {
      // Create the media metadata
      const mediaMetadata: MediaMetadata = {
        generated_by: "render-engine",
        render_job_id: metadata.job_id,
        preset: metadata.render_preset,
        created_at: new Date().toISOString(),
        media_type: metadata.media_type
      }

      if (metadata.camera_angle) {
        mediaMetadata.camera_angle = metadata.camera_angle
      }

      // Update product with new image
      // In Medusa v2, we update the product with the images array
      const product = await this.getProduct(productId, productModuleService)

      if (!product) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Product with ID ${productId} not found`
        )
      }

      // Get existing images
      const existingImages = product.images || []

      // Add new image
      const newImages = [
        ...existingImages.map(img => ({
          id: img.id,
          url: img.url
        })),
        {
          url: fileUrl,
          metadata: mediaMetadata
        }
      ]

      // Update product with new images
      await productModuleService.updateProducts(productId, {
        images: newImages
      })

      // Retrieve the updated product to get the new image ID
      const updatedProduct = await this.getProduct(productId, productModuleService)
      const newImage = updatedProduct.images?.find(
        img => img.url === fileUrl &&
        (img.metadata as any)?.render_job_id === metadata.job_id
      )

      if (!newImage) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Failed to retrieve created media entry"
        )
      }

      this.logger_.debug(
        `Created media ${newImage.id} for product ${productId}: ${fileUrl}`
      )

      return newImage.id
    } catch (error) {
      this.logger_.error(
        `Failed to create product media for ${productId}: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Set product thumbnail to one of the render outputs
   * Typically uses the front_0deg camera angle
   *
   * @param productId - Product ID
   * @param imageUrl - URL of the image to set as thumbnail
   * @throws {MedusaError} If update fails
   */
  async setProductThumbnail(
    productId: string,
    imageUrl: string,
    { productModuleService }: { productModuleService: IProductModuleService }
  ): Promise<void> {
    this.validateProductId(productId)
    this.validateFileUrl(imageUrl)

    try {
      await productModuleService.updateProducts(productId, {
        thumbnail: imageUrl
      })

      this.logger_.info(
        `Set product ${productId} thumbnail to ${imageUrl}`
      )
    } catch (error) {
      this.logger_.error(
        `Failed to set product thumbnail for ${productId}: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Get all media entries created by the render engine for a product
   *
   * @param productId - Product ID
   * @returns Array of media entries with render metadata
   * @throws {MedusaError} If product not found
   */
  async getRenderGeneratedMedia(
    productId: string,
    { productModuleService }: { productModuleService: IProductModuleService }
  ): Promise<ProductMediaWithMetadata[]> {
    this.validateProductId(productId)

    try {
      const product = await this.getProduct(productId, productModuleService)

      if (!product) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Product with ID ${productId} not found`
        )
      }

      // Filter images that have render-engine metadata
      const renderImages = (product.images || []).filter(
        img => {
          const metadata = img.metadata as any
          return metadata?.generated_by === "render-engine"
        }
      ) as ProductMediaWithMetadata[]

      this.logger_.debug(
        `Found ${renderImages.length} render-generated media entries for product ${productId}`
      )

      return renderImages
    } catch (error) {
      this.logger_.error(
        `Failed to get render-generated media for product ${productId}: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Remove all media entries associated with a specific render job
   * Used for cleanup or when retrying failed jobs
   *
   * @param jobId - RenderJob ID
   * @param productId - Product ID to remove media from
   * @returns Count of removed media entries
   * @throws {MedusaError} If removal fails
   */
  async removeMediaByJob(
    jobId: string,
    productId: string,
    { productModuleService }: { productModuleService: IProductModuleService }
  ): Promise<number> {
    this.validateJobId(jobId)
    this.validateProductId(productId)

    try {
      const product = await this.getProduct(productId, productModuleService)

      if (!product) {
        this.logger_.warn(
          `Product ${productId} not found when removing media for job ${jobId}`
        )
        return 0
      }

      const existingImages = product.images || []

      // Filter out images from this job
      const filteredImages = existingImages.filter(img => {
        const metadata = img.metadata as any
        return metadata?.render_job_id !== jobId
      })

      const removedCount = existingImages.length - filteredImages.length

      if (removedCount > 0) {
        // Update product with filtered images
        await productModuleService.updateProducts(productId, {
          images: filteredImages.map(img => ({
            id: img.id,
            url: img.url
          }))
        })

        this.logger_.info(
          `Removed ${removedCount} media entries for job ${jobId} from product ${productId}`
        )
      } else {
        this.logger_.debug(
          `No media entries found for job ${jobId} on product ${productId}`
        )
      }

      return removedCount
    } catch (error) {
      this.logger_.error(
        `Failed to remove media for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Get a product by ID with images relation
   *
   * @param productId - Product ID
   * @param productModuleService - Product module service
   * @returns Product or null if not found
   */
  protected async getProduct(
    productId: string,
    productModuleService: IProductModuleService
  ) {
    const products = await productModuleService.listProducts(
      { id: productId },
      {
        relations: ["images"],
        take: 1
      }
    )

    return products[0] || null
  }

  /**
   * Validate job ID
   *
   * @param jobId - Job ID to validate
   * @throws {MedusaError} If invalid
   */
  protected validateJobId(jobId: string): void {
    if (!jobId || typeof jobId !== "string" || !jobId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "job_id is required and must be a non-empty string"
      )
    }
  }

  /**
   * Validate product ID
   *
   * @param productId - Product ID to validate
   * @throws {MedusaError} If invalid
   */
  protected validateProductId(productId: string): void {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required and must be a non-empty string"
      )
    }
  }

  /**
   * Validate file URL
   *
   * @param fileUrl - File URL to validate
   * @throws {MedusaError} If invalid
   */
  protected validateFileUrl(fileUrl: string): void {
    if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "fileUrl is required and must be a non-empty string"
      )
    }

    // Basic URL validation
    try {
      new URL(fileUrl)
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid file URL: ${fileUrl}`
      )
    }
  }

  /**
   * Validate render outputs
   *
   * @param outputs - Render outputs to validate
   * @throws {MedusaError} If invalid
   */
  protected validateRenderOutputs(outputs: RenderOutputs): void {
    if (!outputs || typeof outputs !== "object") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "outputs is required and must be an object"
      )
    }

    if (!Array.isArray(outputs.renderedImageUrls)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "outputs.renderedImageUrls must be an array"
      )
    }

    if (outputs.renderedImageUrls.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "outputs.renderedImageUrls must contain at least one URL"
      )
    }

    // Validate each URL
    for (let i = 0; i < outputs.renderedImageUrls.length; i++) {
      const url = outputs.renderedImageUrls[i]
      if (!url || typeof url !== "string") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid URL at index ${i} in renderedImageUrls`
        )
      }
    }
  }
}
