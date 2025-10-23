import { Module } from "@medusajs/framework/utils"
import RenderEngineService from "./service"
import { RENDER_ENGINE_MODULE } from "./types"
import renderQueueWorkerLoader from "./loaders/render-queue-worker"

export * from "./types"
export * from "./models"
export * from "./services"
export type { default as RenderEngineService } from "./service"

/**
 * Render Engine Module
 *
 * Provides t-shirt design rendering capabilities using Blender.
 * Manages render jobs, design compositing, and integration with product variants.
 *
 * @module render-engine
 */
export default Module(RENDER_ENGINE_MODULE, {
  service: RenderEngineService,
  loaders: [renderQueueWorkerLoader]
})
