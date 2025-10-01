const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

// Parse backend URL to extract hostname for image optimization
const getBackendHostname = () => {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BACKEND_URL
  if (!backendUrl) return null

  try {
    const url = new URL(backendUrl)
    return url.hostname
  } catch (error) {
    console.warn('[next.config] Invalid backend URL:', backendUrl)
    return null
  }
}

const backendHostname = getBackendHostname()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "100.108.185.11"
  ],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      // Dynamically add backend hostname if configured
      ...(backendHostname && backendHostname !== "localhost"
        ? [
            {
              protocol: "http",
              hostname: backendHostname,
            },
            {
              protocol: "https",
              hostname: backendHostname,
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
    ],
  },
}

module.exports = nextConfig
