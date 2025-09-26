/**
 * Server Detection Utilities
 *
 * These utilities help AI agents detect and work with running development servers
 * without disrupting the user's preferred workflow of keeping the dev server running.
 */

export interface ServerStatus {
  isRunning: boolean;
  port: number;
  url: string;
  responseTime?: number;
}

/**
 * Check if the development server is running on the specified port
 */
export async function checkDevServer(port: number = 8201): Promise<ServerStatus> {
  const url = `http://localhost:${port}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    return {
      isRunning: response.ok,
      port,
      url,
      responseTime,
    };
  } catch (error) {
    return {
      isRunning: false,
      port,
      url,
    };
  }
}

/**
 * Check multiple ports to find a running development server
 */
export async function findRunningServer(ports: number[] = [8201, 3000, 8000]): Promise<ServerStatus | null> {
  const checks = ports.map(port => checkDevServer(port));
  const results = await Promise.all(checks);

  return results.find(result => result.isRunning) || null;
}

/**
 * Wait for server to become available (useful when starting server)
 */
export async function waitForServer(
  port: number = 8201,
  timeoutMs: number = 60000,
  intervalMs: number = 1000
): Promise<ServerStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await checkDevServer(port);
    if (status.isRunning) {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Server did not start within ${timeoutMs}ms on port ${port}`);
}

/**
 * Check if specific Next.js endpoints are available
 */
export async function checkNextJsHealth(baseUrl: string): Promise<{
  isHealthy: boolean;
  checks: Record<string, boolean>;
}> {
  const endpoints = [
    '/_next/static/',
    '/api/health', // if you have a health endpoint
  ];

  const checks: Record<string, boolean> = {};

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      checks[endpoint] = response.ok || response.status === 404; // 404 is ok for some endpoints
    } catch {
      checks[endpoint] = false;
    }
  }

  const isHealthy = Object.values(checks).some(check => check);

  return { isHealthy, checks };
}

/**
 * Utility for AI agents to check server status and provide helpful feedback
 */
export async function validateServerForTesting(): Promise<{
  canProceed: boolean;
  message: string;
  serverStatus: ServerStatus | null;
}> {
  console.log('🔍 Checking for running development server...');

  // First check the preferred port (8201)
  const primaryStatus = await checkDevServer(8201);

  if (primaryStatus.isRunning) {
    const healthCheck = await checkNextJsHealth(primaryStatus.url);

    if (healthCheck.isHealthy) {
      return {
        canProceed: true,
        message: `✅ Development server detected on port 8201 (${primaryStatus.responseTime}ms response time)`,
        serverStatus: primaryStatus,
      };
    } else {
      return {
        canProceed: false,
        message: '⚠️ Server is running on port 8201 but may not be a Next.js development server',
        serverStatus: primaryStatus,
      };
    }
  }

  // Check alternative ports
  console.log('🔍 Checking alternative ports...');
  const alternativeServer = await findRunningServer([3000, 8000, 8080]);

  if (alternativeServer) {
    return {
      canProceed: true,
      message: `✅ Development server found on port ${alternativeServer.port} (expected 8201)`,
      serverStatus: alternativeServer,
    };
  }

  return {
    canProceed: false,
    message: `❌ No development server detected. Please start with: cd apps/storefront1 && bun run dev`,
    serverStatus: null,
  };
}