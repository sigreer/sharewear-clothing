import { Module } from "@medusajs/framework/utils"
import MegaMenuService from "./service"
import { MEGA_MENU_MODULE } from "./types"

export * from "./types"
export type { default as MegaMenuService } from "./service"

export default Module(MEGA_MENU_MODULE, {
  service: MegaMenuService
})
