import { Modules } from "@medusajs/framework/utils"
import { asValue } from "awilix"
import {
  MAILTRAP_NOTIFICATION_DISPATCHER,
  tryBuildMailtrapNotificationDispatcher
} from "../mailtrap-notification-dispatcher"

export default async ({ container, logger }) => {
  const initializeDispatcher = async (): Promise<boolean> => {
    if (container.hasRegistration?.(MAILTRAP_NOTIFICATION_DISPATCHER)) {
      return true
    }

    const dispatcher = tryBuildMailtrapNotificationDispatcher(container)

    if (!dispatcher) {
      return false
    }

    container.register({
      [MAILTRAP_NOTIFICATION_DISPATCHER]: asValue(dispatcher)
    })

    await dispatcher.initialize()
    return true
  }

  const scheduleDeferredInitialization = () => {
    const targetContainers = [
      container,
      resolveOptional(container, "sharedContainer")
    ].filter(candidate => candidate && typeof candidate.afterResolution === "function")

    if (targetContainers.length) {
      targetContainers[0].afterResolution(
        Modules.NOTIFICATION,
        async () => {
          try {
            const initialized = await initializeDispatcher()
            if (!initialized) {
              logger?.warn?.(
                "[mailtrap-plugin] Notification module resolved but dispatcher dependencies are still missing."
              )
            }
          } catch (error) {
            logger?.error?.(
              `[mailtrap-plugin] Deferred notification dispatcher initialization failed: ${
                error instanceof Error ? error.message : "unknown error"
              }`
            )
          }
        },
        { once: true }
      )

      logger?.info?.(
        "[mailtrap-plugin] Deferring Mailtrap notification dispatcher initialization until notification module is available."
      )
      return
    }

    const maxAttempts = 20
    const retryIntervalMs = 500
    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      try {
        const initialized = await initializeDispatcher()
        if (initialized) {
          clearInterval(timer)
          logger?.info?.(
            `[mailtrap-plugin] Mailtrap notification dispatcher initialized after waiting for dependencies (attempt ${attempts}).`
          )
          return
        }

        if (attempts >= maxAttempts) {
          clearInterval(timer)
          logger?.warn?.(
            "[mailtrap-plugin] Mailtrap notification dispatcher could not initialize after waiting for the notification module."
          )
        }
      } catch (error) {
        clearInterval(timer)
        logger?.error?.(
          `[mailtrap-plugin] Deferred notification dispatcher initialization failed: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        )
      }
    }, retryIntervalMs)
  }

  try {
    const initialized = await initializeDispatcher()

    if (!initialized) {
      scheduleDeferredInitialization()
    }
  } catch (error) {
    logger?.error?.(
      `[mailtrap-plugin] Failed to initialize notification dispatcher: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
  }
}

const resolveOptional = (maybeContainer: any, key: string) => {
  if (!maybeContainer || typeof maybeContainer.resolve !== "function") {
    return undefined
  }

  try {
    return maybeContainer.resolve(key, { allowUnregistered: true })
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("allowUnregistered")) {
      try {
        return maybeContainer.resolve(key)
      } catch (err) {
        if (err instanceof Error && err.message.includes(`Could not resolve '${key}'`)) {
          return undefined
        }

        throw err
      }
    }

    if (error instanceof Error && error.message.includes(`Could not resolve '${key}'`)) {
      return undefined
    }

    throw error
  }
}
