import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'
import { config } from 'dotenv'
import path from 'path'

// Load .env.local first, then .env files
config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const maskSecret = (value?: string | null) => {
  if (!value) {
    return 'undefined'
  }

  if (value.length <= 4) {
    return `${value.charAt(0)}***`
  }

  const prefix = value.slice(0, 4)
  const suffix = value.slice(-4)

  return `${prefix}***${suffix}`
}

const parseUrlCandidate = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    return new URL(trimmed)
  } catch (error) {
    console.warn('[medusa-config] Ignoring invalid URL value:', trimmed)
    return undefined
  }
}

const deriveUrlFromAdminCors = () => {
  const adminCors = process.env.ADMIN_CORS
  if (!adminCors) {
    return undefined
  }

  const origins = adminCors
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  for (const origin of origins) {
    const parsed = parseUrlCandidate(origin)
    if (!parsed) {
      continue
    }

    const hostname = parsed.hostname?.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]'
    ) {
      continue
    }

    return parsed
  }

  return undefined
}

const resolveLocalFileBackendUrl = () => {
  const baseCandidate =
    parseUrlCandidate(process.env.MEDUSA_FILE_BASE_URL) ||
    parseUrlCandidate(process.env.MEDUSA_PUBLIC_BASE_URL) ||
    parseUrlCandidate(process.env.MEDUSA_BACKEND_URL) ||
    deriveUrlFromAdminCors()

  if (!baseCandidate) {
    return undefined
  }

  const baseUrl = new URL(baseCandidate.toString())
  const currentPath = baseUrl.pathname.endsWith('/')
    ? baseUrl.pathname.slice(0, -1)
    : baseUrl.pathname

  if (!currentPath.endsWith('/static')) {
    const prefix = currentPath ? `${currentPath}/` : '/'
    baseUrl.pathname = `${prefix}static`
  } else {
    baseUrl.pathname = currentPath
  }

  return baseUrl.toString()
}

const resolvedLocalFileBackendUrl = resolveLocalFileBackendUrl()

// Prevent duplicate logging during multiple config loads
if (!global.__MEDUSA_CONFIG_LOGGED__) {
  global.__MEDUSA_CONFIG_LOGGED__ = true

  console.info('[medusa-config] Environment detected:', {
    nodeEnv: process.env.NODE_ENV,
    appEnv: process.env.APP_ENV,
    databaseUrlSet: Boolean(process.env.DATABASE_URL)
  })

  console.info('[medusa-config] Auth secrets loaded:', {
    jwtSecret: maskSecret(process.env.JWT_SECRET || null),
    cookieSecret: maskSecret(process.env.COOKIE_SECRET || null)
  })

  console.info('[medusa-config] Mailtrap env configuration:', {
    accountId: process.env.MAILTRAP_ACCOUNT_ID || 'undefined',
    sandbox: process.env.MAILTRAP_USE_SANDBOX || 'false',
    testInboxId: process.env.MAILTRAP_TEST_INBOX_ID || 'undefined',
    token: maskSecret(process.env.MAILTRAP_API_TOKEN || null),
    senderEmail: process.env.MAILTRAP_SENDER_EMAIL || 'undefined',
    senderName: process.env.MAILTRAP_SENDER_NAME || 'undefined'
  })

  console.info('[medusa-config] Local file provider static URL:',
    resolvedLocalFileBackendUrl || 'default (http://localhost:9000/static)')
}

const localFileProviderOptions = {
  upload_dir: path.join(process.cwd(), 'static'),
  private_upload_dir: path.join(process.cwd(), 'static'),
  // Use sharewear.local hostname for cross-environment compatibility
  // Each host configures /etc/hosts to point sharewear.local to appropriate IP
  ...(resolvedLocalFileBackendUrl
    ? { backend_url: resolvedLocalFileBackendUrl }
    : {})
}

module.exports = defineConfig({
  admin: {
    vite: () => ({
      server: {
        host: '0.0.0.0',
        allowedHosts: ['localhost', 'sharewear.local', '.sharewear.local'],
      },
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "sharewear-local",
            options: localFileProviderOptions,
          },
        ],
      },
    },
    {
      resolve: "./src/modules/dynamic-category-menu",
      options: {
        baseHref: "/store?category=",
        fallbackToId: true,
        fallbackPrefix: "Browse"
      }
    },
    {
      resolve: "./src/modules/mega-menu",
      dependencies: [Modules.PRODUCT],
      options: {
        baseHref: "/store?category="
      }
    },
    {
      resolve: "./src/modules/mailtrap-plugin",
      dependencies: [
        Modules.NOTIFICATION,
        Modules.EVENT_BUS,
        Modules.PRODUCT
      ],
      options: {
        token: process.env.MAILTRAP_API_TOKEN,
        accountId: process.env.MAILTRAP_ACCOUNT_ID
          ? Number(process.env.MAILTRAP_ACCOUNT_ID)
          : undefined,
        testInboxId: process.env.MAILTRAP_TEST_INBOX_ID
          ? Number(process.env.MAILTRAP_TEST_INBOX_ID)
          : undefined,
        sandbox: process.env.MAILTRAP_USE_SANDBOX === "true",
        senderEmail: process.env.MAILTRAP_SENDER_EMAIL,
        senderName: process.env.MAILTRAP_SENDER_NAME,
      }
    },
    {
      resolve: "./src/modules/category-selector-by-product",
      dependencies: [Modules.PRODUCT]
    },
    {
      resolve: "@medusajs/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/mailtrap-notification",
            id: "mailtrap-notification",
            options: {
              token: process.env.MAILTRAP_API_TOKEN!,
              sender_email: process.env.MAILTRAP_SENDER_EMAIL!,
              sender_name:
                process.env.MAILTRAP_SENDER_NAME || "Medusa Store",
              channels: ["email"],
            }
          }
        ]
      }
    },
    {
      resolve: "@rokmohar/medusa-plugin-meilisearch",
      options: {
        config: {
          host: process.env.MEILISEARCH_HOST,
          apiKey: process.env.MEILISEARCH_API_KEY
        },
        settings: {
          products: {
            type: "products",
            enabled: true,
            fields: [
              "id",
              "title",
              "description",
              "handle",
              "status",
              "collection_id",
              "created_at",
              "updated_at"
            ]
          },
          categories: {
            type: "categories",
            enabled: true,
            fields: [
              "id",
              "name",
              "description",
              "handle"
            ]
          }
        },
        i18n: {
          strategy: "field-suffix",
          languages: ["en"],
          defaultLanguage: "en"
        }
      },
    },
    {
        resolve: "@medusajs/medusa/cache-redis",
        options: {
          redisUrl: process.env.CACHE_REDIS_URL,
        },
      }
  ]
})
