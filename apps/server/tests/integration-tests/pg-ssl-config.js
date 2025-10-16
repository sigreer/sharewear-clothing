/**
 * Configure pg library to disable SSL for test environment
 * This is required because our test PostgreSQL server doesn't have SSL configured
 */

// Patch pg Client to disable SSL before any connections are made
const pg = require('pg')

// Override the pg Client constructor to force SSL disabled
const OriginalClient = pg.Client
pg.Client = function(config) {
  if (typeof config === 'string') {
    // Parse connection string and add sslmode=disable
    config = config.includes('?')
      ? config + '&sslmode=disable'
      : config + '?sslmode=disable'
  } else if (typeof config === 'object' && config !== null) {
    // Force SSL to false for object configs
    config.ssl = false
  }
  return new OriginalClient(config)
}

// Copy over static properties
Object.setPrototypeOf(pg.Client, OriginalClient)
Object.setPrototypeOf(pg.Client.prototype, OriginalClient.prototype)

// Also patch Pool
const OriginalPool = pg.Pool
pg.Pool = function(config) {
  if (typeof config === 'object' && config !== null) {
    config.ssl = false
  }
  return new OriginalPool(config)
}
Object.setPrototypeOf(pg.Pool, OriginalPool)
Object.setPrototypeOf(pg.Pool.prototype, OriginalPool.prototype)

console.log('[test-setup] PostgreSQL SSL disabled for test environment (patched pg.Client and pg.Pool)')
