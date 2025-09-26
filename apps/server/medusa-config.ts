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
}


module.exports = defineConfig({
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
      resolve: "./src/modules/dynamic-category-menu",
      options: {
        baseHref: "/store?category=",
        fallbackToId: true,
        fallbackPrefix: "Browse"
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
